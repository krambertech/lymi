# dmgbuild's settings for the download window; forge.config.js passes the app and the background.
# The background is drawn for these sizes and places by scripts/dmg-background.js. README.md.
format = "ULFO"
files = [defines["app"]]
symlinks = {"Applications": "/Applications"}
background = defines["background"]
window_rect = ((200, 140), (640, 400))
default_view = "icon-view"
show_status_bar = False
show_tab_view = False
show_toolbar = False
show_pathbar = False
show_sidebar = False
show_icon_preview = False
include_icon_view_settings = True
arrange_by = None
icon_size = 112
text_size = 13
icon_locations = {"Lymi.app": (180, 214), "Applications": (460, 214)}
