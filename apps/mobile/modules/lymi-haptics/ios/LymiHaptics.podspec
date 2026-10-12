Pod::Spec.new do |s|
  s.name           = 'LymiHaptics'
  s.version        = '1.0.0'
  s.summary        = 'Core Haptics patterns for the end of a review'
  s.author         = 'Lymi'
  s.homepage       = 'https://lymi.app'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'CoreHaptics'
  s.source_files   = '**/*.swift'
end
