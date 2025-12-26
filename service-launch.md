## 1. Create a systemd **user** service

User services are correct here (no sudo, runs under your account).

### Create service file

```bash
mkdir -p ~/.config/systemd/user
nano ~/.config/systemd/user/framed-tv.service
```

Paste:

```ini
[Unit]
Description=Framed TV Service
After=network.target

[Service]
Type=simple
WorkingDirectory=%h/Documents/Misc/framed-f1
ExecStart=%h/Documents/Misc/framed-f1/framed-tv.sh
Restart=on-failure
RestartSec=3
KillSignal=SIGTERM

[Install]
WantedBy=default.target
```

### Make script executable

```bash
chmod +x ~/Documents/Misc/framed-f1/framed-tv.sh
```

### Reload systemd

```bash
systemctl --user daemon-reload
```

---

## 2. Service lifecycle commands (core)

These are the **real** commands systemd uses:

```bash
systemctl --user start framed-tv
systemctl --user stop framed-tv
systemctl --user restart framed-tv
systemctl --user status framed-tv
```

---

## 3. Create aliases (developer ergonomics)

Add these to `~/.bashrc` or `~/.zshrc`:

```bash
alias framed-tv="systemctl --user start framed-tv"
alias framed-tv-stop="systemctl --user stop framed-tv"
alias framed-tv-restart="systemctl --user restart framed-tv"
alias framed-tv-status="systemctl --user status framed-tv"
```

Reload shell:

```bash
source ~/.bashrc
```

Now you can do:

```bash
framed-tv
framed-tv-stop
framed-tv-restart
```

---

## 4. Optional but recommended improvements

### Auto-start on login

```bash
systemctl --user enable framed-tv
```

### View logs (very useful)

```bash
journalctl --user -u framed-tv -f
```

### Browser opening (optional)

Systemd services should **not open browsers**.
If you want that behavior, create a **separate alias**:

```bash
alias framed-tv-open="xdg-open http://localhost:1507"
```

This keeps responsibilities clean.

