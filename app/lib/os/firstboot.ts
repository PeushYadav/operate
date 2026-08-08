// Interactive first-boot setup. Runs on tty1 before SDDM starts.
// Flow: live user setup → choice of archinstall (preseeded from the build's
// OsConfig via /etc/operate/archinstall.json) or staying live. After a
// successful install, operate-adopt copies the Operate identity (dotfiles,
// SDDM theme, wallpaper, keybinds) onto the installed system — archinstall
// itself only handles packages/services/locale/bootloader from the preseed.

export const firstbootScript = (session: string) => `#!/bin/bash
set -euo pipefail

# ANSI palette — amber on zinc, same identity as the web UI
A=\$'\\e[1;33m'   # amber bold
B=\$'\\e[1m'      # bold
D=\$'\\e[2m'      # dim
E=\$'\\e[1;31m'   # error red
G=\$'\\e[1;32m'   # success green
R=\$'\\e[0m'      # reset

hr()  { printf '%s\\n' "\${D}  ────────────────────────────────────────────────\${R}"; }
say() { printf '%s\\n' "\$1"; }

clear
printf '%s\\n' ""
printf '%s\\n' "  \${A}╭──────────────────────────────────────────────╮\${R}"
printf '%s\\n' "  \${A}│\${R}                                              \${A}│\${R}"
printf '%s\\n' "  \${A}│\${R}     \${B}o p e r a t e\${R}                            \${A}│\${R}"
printf '%s\\n' "  \${A}│\${R}     \${D}your linux, your rules\${R}                   \${A}│\${R}"
printf '%s\\n' "  \${A}│\${R}                                              \${A}│\${R}"
printf '%s\\n' "  \${A}╰──────────────────────────────────────────────╯\${R}"
printf '%s\\n' ""

say "  \${D}[1/3]\${R} \${B}Live session user\${R}"
say "  \${D}Set up a user for this live boot. If you install to disk,\${R}"
say "  \${D}the same credentials carry over — you won't be asked twice.\${R}"
printf '%s\\n' ""

# --- Root password ---
while true; do
  read -rsp "  Set root password: " rpw1; echo
  read -rsp "  Confirm root password: " rpw2; echo
  if [[ "\$rpw1" == "\$rpw2" && -n "\$rpw1" ]]; then break; fi
  say "  \${E}Passwords don't match or empty. Try again.\${R}"
done
echo "root:\$rpw1" | chpasswd

# --- Username ---
while true; do
  read -rp "  Create a username: " username
  if [[ "\$username" =~ ^[a-z][a-z0-9_-]{0,31}\$ ]]; then break; fi
  say "  \${E}Invalid\${R} \${D}(start with lowercase letter; letters/digits/_/- only; max 32 chars)\${R}"
done

# --- User password ---
while true; do
  read -rsp "  Set \${username}'s password: " upw1; echo
  read -rsp "  Confirm password: " upw2; echo
  if [[ "\$upw1" == "\$upw2" && -n "\$upw1" ]]; then break; fi
  say "  \${E}Passwords don't match or empty. Try again.\${R}"
done

useradd -m -G wheel -s /bin/bash "\$username"
echo "\${username}:\${upw1}" | chpasswd

mkdir -p /etc/sddm.conf.d
cat > /etc/sddm.conf.d/autologin.conf <<EOF
[Autologin]
User=\${username}
Session=${session}
EOF

printf '%s\\n' ""
hr
say "  \${D}[2/3]\${R} \${B}What would you like to do?\${R}"
printf '%s\\n' ""
say "    \${A}[i]\${R} Install Operate to your hard drive"
say "    \${A}[l]\${R} Stay in the live session  \${D}(work won't persist after reboot)\${R}"
printf '%s\\n' ""
while true; do
  read -rp "  Choice [i/l]: " choice
  case "\$choice" in
    [iI])
      printf '%s\\n' ""
      hr
      say "  \${D}[3/3]\${R} \${B}Network\${R} \${D}— the installer downloads packages\${R}"
      say "  Waiting for NetworkManager (up to 15s)…"
      nm-online -q --timeout=15 || true

      while true; do
        say "  Testing connectivity to archlinux.org…"
        if curl -sf -m 6 https://archlinux.org/ -o /dev/null; then
          say "  \${G}OK\${R} — internet is reachable."
          break
        fi
        say "  \${E}FAIL\${R} — no internet."
        printf '%s\\n' ""
        say "    \${A}[w]\${R} Configure Wi-Fi  \${D}(opens nmtui)\${R}"
        say "    \${A}[r]\${R} Retry            \${D}(e.g. after plugging in Ethernet)\${R}"
        say "    \${A}[s]\${R} Skip and run the installer anyway \${D}(it will probably fail)\${R}"
        say "    \${A}[c]\${R} Cancel — back to the install/live choice"
        printf '%s\\n' ""
        read -rp "  Choose [w/r/s/c]: " net
        case "\$net" in
          [wW]) nmtui ;;
          [rR]) : ;;
          [sS]) break ;;
          [cC]) continue 2 ;;
          *)    say "  Enter w, r, s, or c." ;;
        esac
      done

      # Auto-login preference for the installed system (live always auto-logs in)
      printf '%s\\n' ""
      read -rp "  Enable auto-login for \${username} on the installed system? [Y/n]: " al
      case "\$al" in
        [nN]*) autologin="no" ;;
        *)     autologin="yes" ;;
      esac

      # Hand the credentials collected above to archinstall — hashed, never
      # written in plaintext. sha512-crypt is fine: archinstall applies it
      # via \`chpasswd --encrypted\` which accepts any crypt(3) format.
      umask 077
      rhash=\$(openssl passwd -6 "\$rpw1")
      uhash=\$(openssl passwd -6 "\$upw1")
      cat > /tmp/operate-creds.json <<EOF
{
  "root_enc_password": "\$rhash",
  "users": [
    { "username": "\$username", "enc_password": "\$uhash", "sudo": true, "groups": [] }
  ]
}
EOF
      umask 022

      printf '%s\\n' ""
      say "  \${A}╭──────────────────────────────────────────────╮\${R}"
      say "  \${A}│\${R}  The installer opens \${B}pre-filled\${R} with your    \${A}│\${R}"
      say "  \${A}│\${R}  Operate config — packages, locale, kernel,  \${A}│\${R}"
      say "  \${A}│\${R}  services and user are already set.          \${A}│\${R}"
      say "  \${A}│\${R}                                              \${A}│\${R}"
      say "  \${A}│\${R}  You only need to:                           \${A}│\${R}"
      say "  \${A}│\${R}   1. Open \${B}Disk configuration\${R} → pick a disk   \${A}│\${R}"
      say "  \${A}│\${R}   2. Select \${B}Install\${R} at the bottom            \${A}│\${R}"
      say "  \${A}│\${R}                                              \${A}│\${R}"
      say "  \${A}│\${R}  When it finishes, choose \${B}Exit\${R} — \${E}not\${R}        \${A}│\${R}"
      say "  \${A}│\${R}  \${E}Reboot\${R} — so Operate can apply your theme.  \${A}│\${R}"
      say "  \${A}╰──────────────────────────────────────────────╯\${R}"
      printf '%s\\n' ""
      read -rp "  Press enter to launch the installer."
      set +e
      archinstall --config /etc/operate/archinstall.json --creds /tmp/operate-creds.json
      rc=\$?
      set -e
      rm -f /tmp/operate-creds.json
      echo
      if [[ \$rc -eq 0 ]]; then
        say "  Applying the Operate look to the installed system…"
        if operate-adopt /mnt "\$username" "\$autologin"; then
          say "  \${G}Theme, wallpaper and dotfiles installed.\${R}"
        else
          say "  \${E}WARN:\${R} could not apply the Operate theme (was the target"
          say "  unmounted?). The installed system still works — it just"
          say "  boots with stock defaults."
        fi
        printf '%s\\n' ""
        say "  \${G}╭──────────────────────────────────────────────╮\${R}"
        say "  \${G}│\${R}  Install complete.                           \${G}│\${R}"
        say "  \${G}│\${R}  \${B}REMOVE the install USB before rebooting\${R},   \${G}│\${R}"
        say "  \${G}│\${R}  otherwise the PC boots the live USB again.  \${G}│\${R}"
        say "  \${G}╰──────────────────────────────────────────────╯\${R}"
        read -rp "  Reboot now? [Y/n]: " r
        case "\$r" in
          [nN]*) break ;;
          *)     systemctl reboot ;;
        esac
      else
        say "  \${E}╭──────────────────────────────────────────────╮\${R}"
        say "  \${E}│\${R}  The installer exited with an error.         \${E}│\${R}"
        say "  \${E}│\${R}  Your hard drive was NOT modified.           \${E}│\${R}"
        say "  \${E}│\${R}  \${D}Logs: /var/log/archinstall/install.log\${R}     \${E}│\${R}"
        say "  \${E}╰──────────────────────────────────────────────╯\${R}"
        read -rp "  Press enter to return to the live session…"
        break
      fi
      ;;
    [lL]) break ;;
    *)    say "  Please enter i or l" ;;
  esac
done

printf '%s\\n' ""
say "  \${D}Starting graphical session…\${R}"
sleep 1
`;

// Copies the Operate identity from the live environment onto a freshly
// installed target. Everything here already exists in the live rootfs at its
// canonical path, so the live system doubles as the payload source.
// archinstall's Installer.__exit__ does NOT unmount the target, so /mnt is
// still live when the guided script returns (user picks "Exit" in the
// post-install menu — the firstboot prompt tells them to).
export const ADOPT_SCRIPT = `#!/bin/bash
# operate-adopt <target> <username> <autologin yes|no>
set -euo pipefail

target="\${1:-/mnt}"
username="\${2:-}"
autologin="\${3:-yes}"

if ! findmnt -rno TARGET "\$target" >/dev/null; then
  echo "operate-adopt: \$target is not a mountpoint" >&2
  exit 1
fi
if [[ ! -d "\$target/etc" ]]; then
  echo "operate-adopt: \$target does not look like an installed system" >&2
  exit 1
fi

# Dotfiles for future users (hypr, waybar, wofi, foot, mako, fastfetch, bashrc)
cp -a /etc/skel/. "\$target/etc/skel/"

# …and for the user archinstall already created (skel only applies at creation)
if [[ -n "\$username" && -d "\$target/home/\$username" ]]; then
  cp -a /etc/skel/. "\$target/home/\$username/"
  passwd_entry=\$(grep "^\${username}:" "\$target/etc/passwd" || true)
  if [[ -n "\$passwd_entry" ]]; then
    uid=\$(cut -d: -f3 <<<"\$passwd_entry")
    gid=\$(cut -d: -f4 <<<"\$passwd_entry")
    chown -R "\$uid:\$gid" "\$target/home/\$username"
  fi
fi

# Keybinds doc + launcher + fastfetch logo + wallpaper
mkdir -p "\$target/etc/operate" "\$target/usr/local/bin" \\
         "\$target/usr/share/backgrounds/operate"
cp -a /etc/operate/keybindings.txt "\$target/etc/operate/"
[[ -f /etc/operate/logo.txt ]] && cp -a /etc/operate/logo.txt "\$target/etc/operate/"
cp -a /usr/local/bin/operate-keybinds "\$target/usr/local/bin/"
cp -a /usr/share/backgrounds/operate/. "\$target/usr/share/backgrounds/operate/"

# SDDM theme + fonts + config
if [[ -d /usr/share/sddm/themes/silent ]]; then
  mkdir -p "\$target/usr/share/sddm/themes" "\$target/etc/sddm.conf.d"
  cp -a /usr/share/sddm/themes/silent "\$target/usr/share/sddm/themes/"
  [[ -d /usr/share/fonts/silent-theme ]] && \\
    cp -a /usr/share/fonts/silent-theme "\$target/usr/share/fonts/"
  cp -a /etc/sddm.conf.d/10-theme.conf "\$target/etc/sddm.conf.d/"
fi

if [[ "\$autologin" == "yes" && -n "\$username" ]]; then
  mkdir -p "\$target/etc/sddm.conf.d"
  cat > "\$target/etc/sddm.conf.d/autologin.conf" <<EOF
[Autologin]
User=\$username
Session=hyprland.desktop
EOF
fi

# Console keymap. The archinstall preseed leaves kb_layout empty so the
# installer skips its nspawn/localectl step (it crashes — archinstall #3876);
# the live vconsole.conf carries the keymap the user chose on the website.
[[ -f /etc/vconsole.conf ]] && cp /etc/vconsole.conf "\$target/etc/vconsole.conf"

# Software-renderer fallback for VMs (no-op on real GPUs — see buildIso.ts)
if ! grep -qs WLR_RENDERER_ALLOW_SOFTWARE "\$target/etc/environment"; then
  cat /etc/environment >> "\$target/etc/environment"
fi

echo "operate-adopt: done"
`;

export const FIRSTBOOT_SERVICE_UNIT = `[Unit]
Description=Operate first-boot setup (interactive)
Conflicts=getty@tty1.service
Before=sddm.service display-manager.service graphical.target
After=systemd-user-sessions.service
ConditionFileIsExecutable=/usr/local/bin/operate-firstboot

[Service]
Type=oneshot
ExecStart=/usr/local/bin/operate-firstboot
StandardInput=tty
StandardOutput=tty
StandardError=tty
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
`;
