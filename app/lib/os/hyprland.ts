export const HYPRLAND_PACKAGES = [
  "hyprland",
  "waybar",
  "foot",
  "wofi",
  "mako",
  "xdg-desktop-portal-hyprland",
  "polkit-kde-agent",
  "qt5-wayland",
  "qt6-wayland",
  "grim",
  "slurp",
  "wl-clipboard",
  "brightnessctl",
  "noto-fonts",
  "noto-fonts-emoji",
  "ttf-jetbrains-mono",
  "ttf-nerd-fonts-symbols-mono",
  "sddm",
  "pipewire",
  "pipewire-pulse",
  "wireplumber",
  "alsa-utils",
  // GPU userspace + firmware. Without these the kernel has no working DRM
  // driver and SDDM/Hyprland render to a black screen (see 2026-06-05 evening).
  "mesa",
  "linux-firmware",
  "vulkan-icd-loader",
  // SilentSDDM theme runtime deps (theme files are baked separately in buildIso.ts)
  "qt6-svg",
  "qt6-virtualkeyboard",
  "qt6-multimedia-ffmpeg",
  // Disk installer — invoked from the first-boot prompt when user picks "Install"
  "archinstall",
  // Look & feel: wallpaper daemon, lock screen, idle daemon, system-info greeter
  "hyprpaper",
  "hyprlock",
  "hypridle",
  "fastfetch",
];

export const HYPRLAND_SERVICES = ["NetworkManager", "sddm"];

export const HYPRLAND_CONF = `# Operate — default Hyprland config
# Full keybindings: Super + K  (or run \`operate-keybinds\`)

monitor=,preferred,auto,1

input {
    kb_layout = us
    follow_mouse = 1
    sensitivity = 0
    touchpad {
        natural_scroll = true
        tap-to-click = true
    }
}

general {
    gaps_in = 5
    gaps_out = 12
    border_size = 2
    col.active_border = rgba(fbbf24ff) rgba(fb923cff) 45deg
    col.inactive_border = rgba(3f3f46aa)
    layout = dwindle
}

decoration {
    rounding = 8
    blur {
        enabled = true
        size = 4
        passes = 2
    }
    # Hyprland >= 0.42 — drop_shadow/col.shadow were replaced by this block
    shadow {
        enabled = true
        range = 6
        render_power = 2
        color = rgba(00000088)
    }
}

animations {
    enabled = true
    bezier = ease, 0.25, 0.1, 0.25, 1.0
    animation = windows,    1, 4, ease
    animation = fade,       1, 4, ease
    animation = workspaces, 1, 4, ease
}

# Hyprland >= 0.55 removed dwindle:pseudotile — pseudo is per-window now,
# toggled by the \`pseudo\` dispatcher (Super + P below).
dwindle {
    preserve_split = true
}

# Autostart
exec-once = waybar
exec-once = mako
exec-once = hyprpaper
exec-once = hypridle
exec-once = /usr/lib/polkit-kde-authentication-agent-1

# Wayland-friendly env
env = XCURSOR_SIZE,24
env = QT_QPA_PLATFORM,wayland
env = MOZ_ENABLE_WAYLAND,1

$mod = SUPER

# === Launching ===
bind = $mod, RETURN, exec, foot
bind = $mod, K,      exec, operate-keybinds
bind = $mod, D,      exec, wofi --show drun
bind = $mod, L,      exec, hyprlock

# === Window control ===
bind = $mod, Q, killactive,
bind = $mod, M, exit,
bind = $mod, V, togglefloating,
bind = $mod, F, fullscreen,
bind = $mod, P, pseudo,

# === Focus ===
bind = $mod, left,  movefocus, l
bind = $mod, right, movefocus, r
bind = $mod, up,    movefocus, u
bind = $mod, down,  movefocus, d

# === Move window ===
bind = $mod SHIFT, left,  movewindow, l
bind = $mod SHIFT, right, movewindow, r
bind = $mod SHIFT, up,    movewindow, u
bind = $mod SHIFT, down,  movewindow, d

# === Workspaces ===
bind = $mod, 1, workspace, 1
bind = $mod, 2, workspace, 2
bind = $mod, 3, workspace, 3
bind = $mod, 4, workspace, 4
bind = $mod, 5, workspace, 5
bind = $mod, 6, workspace, 6
bind = $mod, 7, workspace, 7
bind = $mod, 8, workspace, 8
bind = $mod, 9, workspace, 9
bind = $mod, 0, workspace, 10

bind = $mod SHIFT, 1, movetoworkspace, 1
bind = $mod SHIFT, 2, movetoworkspace, 2
bind = $mod SHIFT, 3, movetoworkspace, 3
bind = $mod SHIFT, 4, movetoworkspace, 4
bind = $mod SHIFT, 5, movetoworkspace, 5
bind = $mod SHIFT, 6, movetoworkspace, 6
bind = $mod SHIFT, 7, movetoworkspace, 7
bind = $mod SHIFT, 8, movetoworkspace, 8
bind = $mod SHIFT, 9, movetoworkspace, 9
bind = $mod SHIFT, 0, movetoworkspace, 10

# === Mouse ===
bindm = $mod, mouse:272, movewindow
bindm = $mod, mouse:273, resizewindow
bind  = $mod, mouse_down, workspace, e+1
bind  = $mod, mouse_up,   workspace, e-1

# === Screenshots ===
bind = ,         Print, exec, grim - | wl-copy
bind = $mod,     Print, exec, grim -g "$(slurp)" - | wl-copy

# === Media / brightness ===
bindel = , XF86AudioRaiseVolume,  exec, wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+
bindel = , XF86AudioLowerVolume,  exec, wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-
bindl  = , XF86AudioMute,         exec, wpctl set-mute   @DEFAULT_AUDIO_SINK@ toggle
bindel = , XF86MonBrightnessUp,   exec, brightnessctl set +5%
bindel = , XF86MonBrightnessDown, exec, brightnessctl set 5%-
`;

export const WAYBAR_CONFIG = `{
    "layer": "top",
    "position": "top",
    "height": 28,
    "spacing": 6,
    "modules-left":   ["hyprland/workspaces"],
    "modules-center": ["hyprland/window"],
    "modules-right":  ["pulseaudio", "network", "battery", "clock", "tray"],

    "hyprland/workspaces": {
        "format": "{id}",
        "on-click": "activate"
    },
    "hyprland/window": {
        "max-length": 60,
        "separate-outputs": true
    },
    "clock": {
        "format": " {:%H:%M  %a %d %b}",
        "tooltip-format": "<tt>{calendar}</tt>"
    },
    "network": {
        "format-wifi": "  {essid}",
        "format-ethernet": "  wired",
        "format-disconnected": "  offline",
        "tooltip-format": "{ifname}: {ipaddr}"
    },
    "pulseaudio": {
        "format": "  {volume}%",
        "format-muted": "  muted",
        "on-click": "wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle"
    },
    "battery": {
        "states": { "warning": 30, "critical": 15 },
        "format": "  {capacity}%",
        "format-charging": "  {capacity}%",
        "format-plugged": "  {capacity}%"
    },
    "tray": {
        "spacing": 8
    }
}
`;

export const WAYBAR_STYLE = `* {
    font-family: "JetBrains Mono", "Symbols Nerd Font", monospace;
    font-size: 12px;
    min-height: 0;
}

window#waybar {
    background: rgba(24, 24, 27, 0.92);
    color: #d4d4d8;
    border-bottom: 1px solid rgba(251, 191, 36, 0.4);
}

#workspaces button {
    padding: 0 8px;
    background: transparent;
    color: #71717a;
    border-radius: 4px;
    margin: 2px;
}
#workspaces button.active {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.08);
}
#workspaces button:hover {
    background: rgba(251, 191, 36, 0.05);
    color: #d4d4d8;
}

#window {
    color: #d4d4d8;
}

#clock, #network, #pulseaudio, #battery, #tray {
    padding: 0 12px;
    color: #d4d4d8;
}
#battery.warning {
    color: #fbbf24;
}
#battery.critical {
    color: #f87171;
}
`;

export const KEYBINDINGS_DOC = `╭─────────────────────────────────────────────────────────────────────╮
│             OPERATE — HYPRLAND KEY BINDINGS                         │
╰─────────────────────────────────────────────────────────────────────╯

  Modifier: SUPER  (also called the Windows / Command key)

  ─── Launching ─────────────────────────────────────────────────────
  Super + Enter          Open terminal (foot)
  Super + K              Show this help screen
  Super + D              App launcher (wofi)
  Super + L              Lock screen (hyprlock)

  ─── Window control ───────────────────────────────────────────────
  Super + Q              Close focused window
  Super + F              Toggle fullscreen
  Super + V              Toggle floating
  Super + P              Toggle pseudo
  Super + M              Exit Hyprland session
  Super + Mouse LMB drag Move window
  Super + Mouse RMB drag Resize window

  ─── Focus ────────────────────────────────────────────────────────
  Super + ← / → / ↑ / ↓  Move focus between windows

  ─── Move windows ─────────────────────────────────────────────────
  Super + Shift + arrows Move active window in direction

  ─── Workspaces ───────────────────────────────────────────────────
  Super + 1..0           Switch to workspace 1..10
  Super + Shift + 1..0   Move window to workspace 1..10
  Super + scroll         Cycle workspaces

  ─── System ───────────────────────────────────────────────────────
  Print                  Screenshot full screen (to clipboard)
  Super + Print          Screenshot region (to clipboard)
  Volume keys            Adjust system volume (PipeWire)
  Brightness keys        Adjust screen brightness

  ─── Tips ─────────────────────────────────────────────────────────
  • Hyprland config:     ~/.config/hypr/hyprland.conf
  • Waybar config:       ~/.config/waybar/
  • Wallpaper:           ~/.config/hypr/hyprpaper.conf
  • Lock / idle:         ~/.config/hypr/hyprlock.conf, hypridle.conf
  • This help screen:    /etc/operate/keybindings.txt
  • Reload Hyprland:     hyprctl reload

  Press q to quit.
`;

export const KEYBINDS_LAUNCHER_SCRIPT = `#!/bin/bash
exec foot -T "Operate Keybindings" -e less /etc/operate/keybindings.txt
`;

export const WALLPAPER_PATH = "/usr/share/backgrounds/operate/wallpaper.png";

export const HYPRPAPER_CONF = `preload = ${WALLPAPER_PATH}
wallpaper = ,${WALLPAPER_PATH}
splash = false
`;

export const HYPRLOCK_CONF = `# Operate — lock screen (Super + L)
background {
    monitor =
    path = ${WALLPAPER_PATH}
    blur_passes = 3
    blur_size = 6
    brightness = 0.6
}

input-field {
    monitor =
    size = 260, 46
    outline_thickness = 2
    dots_size = 0.25
    dots_spacing = 0.25
    outer_color = rgba(fbbf24aa)
    inner_color = rgba(18181bee)
    font_color = rgba(e4e4e7ff)
    placeholder_text = <i>password…</i>
    fail_text = <i>wrong — attempt $ATTEMPTS</i>
    rounding = 8
    position = 0, -40
    halign = center
    valign = center
}

label {
    monitor =
    text = $TIME
    color = rgba(e4e4e7ff)
    font_size = 72
    font_family = JetBrains Mono
    position = 0, 120
    halign = center
    valign = center
}

label {
    monitor =
    text = operate
    color = rgba(fbbf24cc)
    font_size = 14
    font_family = JetBrains Mono
    position = 0, 48
    halign = center
    valign = center
}
`;

export const HYPRIDLE_CONF = `# Operate — idle behaviour
general {
    lock_cmd = pidof hyprlock || hyprlock
    before_sleep_cmd = loginctl lock-session
    after_sleep_cmd = hyprctl dispatch dpms on
}

# Lock after 10 minutes idle
listener {
    timeout = 600
    on-timeout = loginctl lock-session
}

# Screen off after 15 minutes idle
listener {
    timeout = 900
    on-timeout = hyprctl dispatch dpms off
    on-resume = hyprctl dispatch dpms on
}
`;

export const WOFI_CONFIG = `show=drun
prompt=run
width=560
height=380
allow_images=true
image_size=24
insensitive=true
matching=fuzzy
no_actions=true
key_expand=Tab
`;

export const WOFI_STYLE = `* {
    font-family: "JetBrains Mono", monospace;
    font-size: 13px;
}

window {
    background-color: rgba(24, 24, 27, 0.96);
    border: 2px solid rgba(251, 191, 36, 0.55);
    border-radius: 10px;
}

#input {
    margin: 10px;
    padding: 8px 12px;
    border: 1px solid #3f3f46;
    border-radius: 8px;
    background-color: #27272a;
    color: #e4e4e7;
}
#input:focus {
    border-color: rgba(251, 191, 36, 0.7);
}

#inner-box,
#outer-box {
    margin: 0 6px 6px 6px;
    background-color: transparent;
    color: #d4d4d8;
}

#entry {
    padding: 7px 10px;
    border-radius: 8px;
}
#entry:selected {
    background-color: rgba(251, 191, 36, 0.12);
    color: #fbbf24;
    outline: none;
}
#text:selected {
    color: #fbbf24;
}
`;

export const FOOT_CONFIG = `# Operate — foot terminal
font=JetBrains Mono:size=11
pad=12x12

[cursor]
style=beam
blink=yes

[colors]
alpha=0.94
background=131316
foreground=d4d4d8

# zinc-flavoured dark palette with an amber accent
regular0=27272a
regular1=f87171
regular2=4ade80
regular3=fbbf24
regular4=60a5fa
regular5=c084fc
regular6=22d3ee
regular7=d4d4d8

bright0=3f3f46
bright1=fca5a5
bright2=86efac
bright3=fcd34d
bright4=93c5fd
bright5=d8b4fe
bright6=67e8f9
bright7=fafafa

selection-background=fbbf24
selection-foreground=18181b
`;

export const MAKO_CONFIG = `# Operate — notifications
font=JetBrains Mono 11
background-color=#18181bf2
text-color=#e4e4e7
border-color=#fbbf2488
border-size=2
border-radius=10
padding=12
default-timeout=6000
max-visible=4
anchor=top-right
margin=12

[urgency=critical]
border-color=#f87171
default-timeout=0
`;

export const OPERATE_LOGO_ASCII = `   ____  ____  ___  _________ _/ /____
  / __ \\/ __ \\/ _ \\/ ___/ __ \`/ __/ _ \\
 / /_/ / /_/ /  __/ /  / /_/ / /_/  __/
 \\____/ .___/\\___/_/   \\__,_/\\__/\\___/
     /_/
`;

export const FASTFETCH_CONFIG = `{
    "$schema": "https://github.com/fastfetch-cli/fastfetch/raw/dev/doc/json_schema.json",
    "logo": {
        "source": "/etc/operate/logo.txt",
        "type": "file",
        "color": { "1": "yellow" },
        "padding": { "top": 1, "right": 3 }
    },
    "display": {
        "separator": "  ",
        "color": { "keys": "yellow" }
    },
    "modules": [
        { "type": "title", "format": "{user-name}@{host-name}" },
        { "type": "os", "key": "os" },
        { "type": "kernel", "key": "kernel" },
        { "type": "wm", "key": "wm" },
        { "type": "uptime", "key": "uptime" },
        { "type": "packages", "key": "pkgs" },
        { "type": "memory", "key": "mem" },
        { "type": "colors", "symbol": "circle" }
    ]
}
`;

export const SKEL_BASHRC = `# Operate — default shell setup
[[ $- != *i* ]] && return

alias ls='ls --color=auto'
alias ll='ls -lah'
alias grep='grep --color=auto'
alias keys='operate-keybinds'

# amber user@host, zinc path
PS1='\\[\\e[1;33m\\]\\u@\\h\\[\\e[0m\\] \\[\\e[90m\\]\\w\\[\\e[0m\\] \\[\\e[1;33m\\]›\\[\\e[0m\\] '

# system greeting on new terminals
command -v fastfetch >/dev/null && fastfetch
`;
