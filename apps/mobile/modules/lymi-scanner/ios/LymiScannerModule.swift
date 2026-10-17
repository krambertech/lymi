import ExpoModulesCore
import VisionKit

/// One scanned page, written to the cache as a JPEG.
struct ScannedPage: Record {
  @Field var uri: String = ""
  @Field var width: Int = 0
  @Field var height: Int = 0
}

/// Presents VisionKit's document camera, which finds each page's edges and flattens it, so Smart add
/// can take several lesson pages in one go.
public class LymiScannerModule: Module {
  private var scan: Scan?

  public func definition() -> ModuleDefinition {
    Name("LymiScanner")

    Function("isAvailable") {
      VNDocumentCameraViewController.isSupported
    }

    AsyncFunction("scan") { (promise: Promise) in
      try self.present(promise)
    }
    .runOnQueue(.main)
  }

  private func present(_ promise: Promise) throws {
    guard scan == nil else { throw ScanInProgressException() }
    guard VNDocumentCameraViewController.isSupported else { throw ScannerUnavailableException() }
    guard let top = appContext?.utilities?.currentViewController() else {
      throw MissingViewControllerException()
    }
    let caches = appContext?.config.cacheDirectory ?? FileManager.default.temporaryDirectory
    let scan = Scan(
      promise: promise, directory: caches.appendingPathComponent("LymiScanner", isDirectory: true)
    ) { [weak self] in self?.scan = nil }
    let camera = VNDocumentCameraViewController()
    // A sheet could be swiped away without telling the delegate, leaving the promise unsettled.
    camera.modalPresentationStyle = .fullScreen
    camera.delegate = scan
    self.scan = scan
    top.present(camera, animated: true)
  }
}

/// Settles one scan's promise; the module holds it until dismissal because the camera's delegate is weak.
private final class Scan: NSObject, VNDocumentCameraViewControllerDelegate {
  private let promise: Promise
  private let directory: URL
  private let onDismiss: () -> Void

  init(promise: Promise, directory: URL, onDismiss: @escaping () -> Void) {
    self.promise = promise
    self.directory = directory
    self.onDismiss = onDismiss
  }

  func documentCameraViewController(
    _ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan
  ) {
    let promise = self.promise
    let directory = self.directory
    dismiss(controller) {
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
          let pages = try (0..<scan.pageCount).map { index in
            try autoreleasepool { try savePage(scan.imageOfPage(at: index), in: directory) }
          }
          promise.resolve(pages)
        } catch {
          promise.reject(error)
        }
      }
    }
  }

  func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
    dismiss(controller) { self.promise.resolve([ScannedPage]()) }
  }

  func documentCameraViewController(
    _ controller: VNDocumentCameraViewController, didFailWithError error: Error
  ) {
    dismiss(controller) { self.promise.reject(error) }
  }

  private func dismiss(_ controller: VNDocumentCameraViewController, then settle: @escaping () -> Void) {
    controller.dismiss(animated: true) {
      self.onDismiss()
      settle()
    }
  }
}

private let longestSide: CGFloat = 1536

private func savePage(_ image: UIImage, in directory: URL) throws -> ScannedPage {
  let pixels = CGSize(width: image.size.width * image.scale, height: image.size.height * image.scale)
  let fit = min(1, longestSide / max(pixels.width, pixels.height))
  let size = CGSize(width: (pixels.width * fit).rounded(), height: (pixels.height * fit).rounded())
  let format = UIGraphicsImageRendererFormat()
  format.scale = 1
  format.opaque = true
  format.preferredRange = .standard
  let data = UIGraphicsImageRenderer(size: size, format: format).jpegData(withCompressionQuality: 0.85) { _ in
    image.draw(in: CGRect(origin: .zero, size: size))
  }
  let url = directory.appendingPathComponent("\(UUID().uuidString).jpg")
  try data.write(to: url, options: .atomic)
  let page = ScannedPage()
  page.uri = url.absoluteString
  page.width = Int(size.width)
  page.height = Int(size.height)
  return page
}

internal final class ScanInProgressException: Exception {
  override var reason: String { "A scan is already open" }
}

internal final class ScannerUnavailableException: Exception {
  override var reason: String { "This device cannot scan documents" }
}

internal final class MissingViewControllerException: Exception {
  override var reason: String { "Cannot find a view controller to present the scanner from" }
}
