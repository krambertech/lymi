Pod::Spec.new do |s|
  s.name           = 'LymiScanner'
  s.version        = '1.0.0'
  s.summary        = 'VisionKit document camera for Smart add'
  s.author         = 'Lymi'
  s.homepage       = 'https://lymi.app'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'VisionKit'
  s.source_files   = '**/*.swift'
end
