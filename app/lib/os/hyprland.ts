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
    drop_shadow = true
    shadow_range = 6
    shadow_render_power = 2
    col.shadow = rgba(00000088)
}

animations {
    enabled = true
    bezier = ease, 0.25, 0.1, 0.25, 1.0
    animation = windows,    1, 4, ease
    animation = fade,       1, 4, ease
    animation = workspaces, 1, 4, ease
}

dwindle {
    pseudotile      = true
    preserve_split  = true
}

# Autostart
exec-once = waybar
exec-once = mako
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
  • This help screen:    /etc/operate/keybindings.txt
  • Reload Hyprland:     hyprctl reload

  Press q to quit.
`;

export const KEYBINDS_LAUNCHER_SCRIPT = `#!/bin/bash
exec foot -T "Operate Keybindings" -e less /etc/operate/keybindings.txt
`;
