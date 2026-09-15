# Installation guide

This guide explains how to install and run Stype on your local machine as a desktop application, or host the client as a static web app.

---

## Desktop application

Stype provides native desktop builds for Linux, macOS, and Windows powered by Tauri 2. The desktop app operates entirely offline and persists test runs, passages, and preferences to a local SQLite database.

### Download pre-built releases

Pre-built binaries are available on the [GitHub Releases](https://github.com/Trindade7/stype/releases) page.

#### Linux

Download either the `.AppImage` or `.deb` package:

- **AppImage:**
  ```sh
  chmod +x Stype-*.AppImage
  ./Stype-*.AppImage
  ```
- **Debian / Ubuntu package:**
  ```sh
  sudo dpkg -i stype_*_amd64.deb
  ```

#### macOS

1. Download the `.dmg` file.
2. Open the image and drag **Stype** to your `/Applications` directory.
3. On first launch, if macOS prompts about an unidentified developer, open **System Settings > Privacy & Security** and click **Open Anyway**.

#### Windows

Download and run the `.msi` installer or standalone `.exe` bundle, then follow the on-screen setup prompts.

---

### Build desktop binaries from source

To compile the desktop application on your own machine:

#### 1. Install prerequisites

- **Node.js:** 20 or later with `pnpm` (`corepack enable`).
- **Rust:** Latest stable toolchain via [rustup](https://rustup.rs):
  ```sh
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

If building on Linux, install the required native system libraries:

```sh
# Debian / Ubuntu
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

#### 2. Clone and install dependencies

```sh
git clone git@github.com:Trindade7/stype.git
cd stype
pnpm install
```

#### 3. Run the desktop build

```sh
pnpm build:tauri
```

This compiles the static web client using `STATIC_BUILD=1`, then invokes Cargo to build native binaries.

Compiled artifacts are located in:

- **Linux:** `src-tauri/target/release/bundle/appimage/` and `src-tauri/target/release/bundle/deb/`
- **macOS:** `src-tauri/target/release/bundle/dmg/` and `src-tauri/target/release/bundle/macos/`
- **Windows:** `src-tauri/target/release/bundle/msi/` and `src-tauri/target/release/bundle/nsis/`

---

## Static web application

You can host Stype as a static single-page application without running a backend server. The static client runs entirely in the browser, storing test runs, custom passages, and settings in IndexedDB.

### Build static assets

To produce static assets for hosting:

```sh
pnpm build:static
```

This generates pure HTML, JavaScript, CSS, and font files in the `build/` directory with an `index.html` fallback.

### Host on Cloudflare Pages

1. In the Cloudflare dashboard, go to **Workers & Pages > Create application > Pages > Connect to Git**.
2. Select the `stype` repository.
3. Configure the build settings:
   - **Framework preset:** SvelteKit
   - **Build command:** `pnpm build:static`
   - **Build output directory:** `build`
4. Under **Environment variables**, add:
   - `STATIC_BUILD`: `1`
5. Click **Save and Deploy**.

### Host on Vercel

1. Import the repository into your Vercel dashboard.
2. Under **Build & Development Settings**:
   - **Build Command:** `pnpm build:static`
   - **Output Directory:** `build`
3. Add an environment variable:
   - `STATIC_BUILD`: `1`
4. Deploy the project.

### Host with Nginx or static file servers

Any web server can serve the `build/` directory. Configure the server to route unknown paths to `index.html` so client-side routing works:

```nginx
server {
    listen 80;
    server_name typing.example.com;
    root /var/www/stype;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|woff2|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Copy the compiled files:

```sh
sudo cp -r build/* /var/www/stype/
```

---

## Remote synchronization

Stype operates offline by default. You can link your desktop app or static web client to a self-hosted Stype server to back up and synchronize your typing history across devices.

### How synchronization works

- **Test runs.** Synchronized using set union by UUID. Completed typing runs from every device merge into your account history without duplicates or data loss.
- **Custom passages.** Synchronized bidirectionally using last-write-wins by modification timestamp. Deleted passages propagate across devices using soft-delete tombstones.
- **Preferences.** Visual and typing settings synchronize bidirectionally, keeping your theme, scroll style, and HUD options consistent.

### Link a self-hosted account

1. Open Stype in your browser or launch the desktop app.
2. Click the cloud icon in the top navigation bar.
3. Enter your server URL (for example, `https://stype.example.com`).
4. Enter your username or email address and password.
5. Click **Link Account**.

Once authenticated, Stype runs an initial sync and stores the connection token securely in local storage.

### Triggering synchronization

Stype syncs automatically in the background:
- Immediately upon linking your account.
- Every time you finish a typing test.
- Periodically while the application window is open.

To trigger synchronization manually at any time, click the cloud icon in the header and click **Sync Now**.

### Unlink an account

To stop syncing and return the client to standalone offline mode:
1. Click the cloud icon in the header.
2. Click **Unlink Account**.

All test runs, custom passages, and settings remain saved locally on your device.

