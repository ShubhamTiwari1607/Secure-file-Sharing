const STORAGE_KEYS = {
    apiBase: "vaultflow.apiBase",
    token: "vaultflow.token",
    email: "vaultflow.email",
    activities: "vaultflow.activities",
    latestUpload: "vaultflow.latestUpload"
};

const state = {
    apiBase: localStorage.getItem(STORAGE_KEYS.apiBase) || "http://localhost:8080",
    token: localStorage.getItem(STORAGE_KEYS.token) || "",
    email: localStorage.getItem(STORAGE_KEYS.email) || "",
    files: [],
    activities: readJson(STORAGE_KEYS.activities, []),
    latestUpload: readJson(STORAGE_KEYS.latestUpload, null)
};

const elements = {
    apiBaseInput: document.querySelector("#apiBaseInput"),
    saveApiBaseButton: document.querySelector("#saveApiBaseButton"),
    refreshHealthButton: document.querySelector("#refreshHealthButton"),
    serverStatusPill: document.querySelector("#serverStatusPill"),
    sessionMetric: document.querySelector("#sessionMetric"),
    sessionMetricDetail: document.querySelector("#sessionMetricDetail"),
    trackedFileCount: document.querySelector("#trackedFileCount"),
    sessionEmail: document.querySelector("#sessionEmail"),
    tokenPreview: document.querySelector("#tokenPreview"),
    globalNotice: document.querySelector("#globalNotice"),
    signupForm: document.querySelector("#signupForm"),
    loginForm: document.querySelector("#loginForm"),
    uploadForm: document.querySelector("#uploadForm"),
    downloadForm: document.querySelector("#downloadForm"),
    logoutButton: document.querySelector("#logoutButton"),
    refreshFilesButton: document.querySelector("#refreshFilesButton"),
    clearActivityButton: document.querySelector("#clearActivityButton"),
    signupEmail: document.querySelector("#signupEmail"),
    signupPassword: document.querySelector("#signupPassword"),
    loginEmail: document.querySelector("#loginEmail"),
    loginPassword: document.querySelector("#loginPassword"),
    signupFeedback: document.querySelector("#signupFeedback"),
    loginFeedback: document.querySelector("#loginFeedback"),
    uploadFeedback: document.querySelector("#uploadFeedback"),
    downloadFeedback: document.querySelector("#downloadFeedback"),
    selectedFileName: document.querySelector("#selectedFileName"),
    uploadFile: document.querySelector("#uploadFile"),
    uploadProgressBar: document.querySelector("#uploadProgressBar"),
    latestUploadCard: document.querySelector("#latestUploadCard"),
    filesList: document.querySelector("#filesList"),
    activityList: document.querySelector("#activityList"),
    downloadFileId: document.querySelector("#downloadFileId")
};

boot();

function boot() {
    elements.apiBaseInput.value = state.apiBase;
    bindEvents();
    renderSession();
    renderLatestUpload();
    renderActivities();
    renderFiles();
    refreshHealth();

    if (state.token) {
        refreshFiles();
    }
}

function bindEvents() {
    elements.saveApiBaseButton.addEventListener("click", () => {
        state.apiBase = normalizeBaseUrl(elements.apiBaseInput.value);
        localStorage.setItem(STORAGE_KEYS.apiBase, state.apiBase);
        setNotice(`Backend URL updated to ${state.apiBase}.`, "success");
        addActivity("info", "Backend URL updated", state.apiBase);
        refreshHealth();
        if (state.token) {
            refreshFiles();
        }
    });

    elements.refreshHealthButton.addEventListener("click", refreshHealth);

    // Tab switching for download section
    const tabButtons = document.querySelectorAll(".tab-button");
    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const tabName = button.dataset.tab;
            
            // Remove active from all buttons and tabs
            tabButtons.forEach(btn => btn.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
            
            // Add active to clicked button and corresponding tab
            button.classList.add("active");
            document.getElementById(`${tabName}-tab`).classList.add("active");
        });
    });

    // Set first tab as active by default
    if (tabButtons.length > 0) {
        tabButtons[0].classList.add("active");
        document.getElementById(`${tabButtons[0].dataset.tab}-tab`).classList.add("active");
    }

    elements.signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setFeedback(elements.signupFeedback, "Creating your account...", "info");

        const email = elements.signupEmail.value.trim();
        const password = elements.signupPassword.value;

        try {
            const responseText = await requestText("/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (responseText.startsWith("Error")) {
                throw new Error(responseText);
            }

            elements.loginEmail.value = email;
            setFeedback(elements.signupFeedback, responseText, "success");
            addActivity("success", "Account created", email);
            setNotice("Account created. Sign in to begin uploading.", "success");
            elements.signupForm.reset();
        } catch (error) {
            const message = getMessage(error);
            setFeedback(elements.signupFeedback, message, "error");
            addActivity("error", "Signup failed", message);
        }
    });

    elements.loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setFeedback(elements.loginFeedback, "Opening secure session...", "info");

        const email = elements.loginEmail.value.trim();
        const password = elements.loginPassword.value;

        try {
            const token = await requestText("/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (token.startsWith("Error")) {
                throw new Error(token);
            }

            state.token = token;
            state.email = email;
            localStorage.setItem(STORAGE_KEYS.token, token);
            localStorage.setItem(STORAGE_KEYS.email, email);

            renderSession();
            setFeedback(elements.loginFeedback, "Session active. Your vault is unlocked.", "success");
            setNotice(`Signed in as ${email}.`, "success");
            addActivity("success", "Signed in", email);
            await refreshFiles();
        } catch (error) {
            const message = getMessage(error);
            setFeedback(elements.loginFeedback, message, "error");
            addActivity("error", "Login failed", message);
        }
    });

    elements.uploadFile.addEventListener("change", () => {
        const file = elements.uploadFile.files?.[0];
        elements.selectedFileName.textContent = file
            ? `${file.name} - ${formatBytes(file.size)}`
            : "No file selected";
    });

    elements.uploadForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!ensureSession("Sign in before uploading a file.")) {
            return;
        }

        const file = elements.uploadFile.files?.[0];
        if (!file) {
            setFeedback(elements.uploadFeedback, "Choose a file before uploading.", "error");
            return;
        }

        try {
            setFeedback(elements.uploadFeedback, "Uploading and encrypting your file...", "info");
            const response = await uploadFile(file);

            state.latestUpload = {
                fileId: response.fileId,
                fileName: response.fileName
            };
            localStorage.setItem(STORAGE_KEYS.latestUpload, JSON.stringify(state.latestUpload));

            setUploadProgress(100);
            renderLatestUpload();
            setFeedback(
                elements.uploadFeedback,
                `${response.fileName} uploaded successfully with id #${response.fileId}.`,
                "success"
            );
            addActivity("success", "File uploaded", `${response.fileName} - id #${response.fileId}`);
            elements.uploadForm.reset();
            elements.selectedFileName.textContent = "No file selected";
            setTimeout(() => setUploadProgress(0), 700);
            await refreshFiles();
        } catch (error) {
            setUploadProgress(0);
            const message = getMessage(error);
            setFeedback(elements.uploadFeedback, message, "error");
            addActivity("error", "Upload failed", message);
        }
    });

    elements.downloadForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!ensureSession("Sign in before downloading a file.")) {
            return;
        }

        const fileId = elements.downloadFileId.value.trim();
        if (!fileId) {
            setFeedback(elements.downloadFeedback, "Enter a file ID to download.", "error");
            return;
        }

        console.log("Triggering download from Search by ID with fileId:", fileId, "Token:", state.token.substring(0, 20) + "...");
        await triggerDownload(fileId);
    });

    elements.logoutButton.addEventListener("click", () => {
        state.token = "";
        state.email = "";
        state.files = [];
        localStorage.removeItem(STORAGE_KEYS.token);
        localStorage.removeItem(STORAGE_KEYS.email);
        renderSession();
        renderFiles();
        setNotice("Session cleared from this browser.", "info");
        addActivity("info", "Session cleared", "Local token removed");
    });

    elements.refreshFilesButton.addEventListener("click", refreshFiles);

    elements.clearActivityButton.addEventListener("click", () => {
        state.activities = [];
        persistActivities();
        renderActivities();
    });
}

async function refreshHealth() {
    elements.serverStatusPill.textContent = "Checking backend...";
    elements.serverStatusPill.className = "status-pill";

    try {
        const text = await requestText("/auth/home", { method: "GET" }, false);
        elements.serverStatusPill.textContent = text === "server started"
            ? "Backend online"
            : "Backend responded";
        elements.serverStatusPill.classList.add("online");
    } catch (error) {
        elements.serverStatusPill.textContent = "Backend unreachable";
        elements.serverStatusPill.classList.add("offline");
    }
}

async function refreshFiles() {
    if (!state.token) {
        state.files = [];
        renderFiles();
        return;
    }

    try {
        const files = await requestJson("/files", { method: "GET" }, true);
        state.files = Array.isArray(files) ? files : [];
        renderFiles();
        setNotice("Secure file list refreshed.", "success");
    } catch (error) {
        state.files = [];
        renderFiles();
        setNotice(getMessage(error), "error");
        addActivity("error", "Could not load file list", getMessage(error));
    }
}

function renderSession() {
    const hasSession = Boolean(state.token);
    elements.sessionMetric.textContent = hasSession ? "Active" : "Guest";
    elements.sessionMetricDetail.textContent = hasSession
        ? "JWT stored locally for authenticated routes"
        : "Sign in to unlock the vault";
    elements.sessionEmail.textContent = hasSession ? state.email : "Not signed in";
    elements.tokenPreview.textContent = hasSession
        ? `${state.token.slice(0, 18)}...${state.token.slice(-12)}`
        : "No token stored";

    if (!hasSession) {
        setNotice("Connect to the backend, then sign in to upload encrypted files.", "info");
    }
}

function renderFiles() {
    elements.trackedFileCount.textContent = String(state.files.length);

    if (!state.token) {
        elements.filesList.innerHTML = `<div class="empty-state">Sign in to load your encrypted files from the backend.</div>`;
        return;
    }

    if (!state.files.length) {
        elements.filesList.innerHTML = `<div class="empty-state">No files are stored for this account yet. Upload one to see it appear here.</div>`;
        return;
    }

    elements.filesList.innerHTML = state.files.map((file) => `
        <article class="file-item">
            <div>
                <strong class="file-name">${escapeHtml(file.fileName ?? "Untitled file")}</strong>
                <span class="file-meta">File ID #${escapeHtml(String(file.id ?? ""))}</span>
            </div>
            <button class="mini-button" data-download-id="${escapeHtml(String(file.id ?? ""))}" data-download-name="${escapeHtml(file.fileName ?? "file")}">
                Download
            </button>
        </article>
    `).join("");

    elements.filesList.querySelectorAll("[data-download-id]").forEach((button) => {
        button.addEventListener("click", async () => {
            console.log("Triggering download from Browse Vault with fileId:", button.dataset.downloadId, "fileName:", button.dataset.downloadName, "Token:", state.token.substring(0, 20) + "...");
            await triggerDownload(button.dataset.downloadId, button.dataset.downloadName);
        });
    });
}

function renderLatestUpload() {
    const latest = state.latestUpload;
    if (!latest?.fileId) {
        elements.latestUploadCard.innerHTML = `
            <span class="session-label">Latest upload</span>
            <strong>Nothing uploaded in this session yet</strong>
            <p>Once the backend returns a file ID, it will appear here for one-click download.</p>
        `;
        return;
    }

    elements.latestUploadCard.innerHTML = `
        <span class="session-label">Latest upload</span>
        <strong>${escapeHtml(latest.fileName)}</strong>
        <p>Stored as file id #${escapeHtml(String(latest.fileId))}.</p>
        <button class="mini-button" id="latestUploadDownloadButton" type="button">Download Latest File</button>
    `;

    document.querySelector("#latestUploadDownloadButton")?.addEventListener("click", async () => {
        await triggerDownload(latest.fileId, latest.fileName);
    });
}

function renderActivities() {
    if (!state.activities.length) {
        elements.activityList.innerHTML = `<div class="empty-state">No activity yet. Your uploads, downloads, and auth events will appear here.</div>`;
        return;
    }

    elements.activityList.innerHTML = state.activities.map((entry) => `
        <article class="activity-item ${escapeHtml(entry.status)}">
            <div>
                <p class="activity-title">${escapeHtml(entry.title)}</p>
                <div class="activity-meta">${escapeHtml(entry.detail)}</div>
            </div>
            <div class="activity-meta">${escapeHtml(entry.time)}</div>
        </article>
    `).join("");
}

async function triggerDownload(fileId, suggestedName = "secure-file") {
    try {
        setFeedback(elements.downloadFeedback, `Downloading file #${fileId}...`, "info");
        const response = await fetch(`${state.apiBase}/files/${fileId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${state.token}`
            }
        });

        if (!response.ok) {
            throw new Error(await readError(response));
        }

        const blob = await response.blob();
        console.log("Downloaded blob size:", blob.size, "bytes");
        console.log("Response headers:", {
            contentType: response.headers.get("Content-Type"),
            disposition: response.headers.get("Content-Disposition"),
            fileSize: response.headers.get("X-File-Size")
        });
        
        const disposition = response.headers.get("Content-Disposition") || "";
        const match = disposition.match(/filename="?([^"]+)"?/i);
        const filename = match?.[1] || suggestedName || `file-${fileId}`;

        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(objectUrl);

        setFeedback(elements.downloadFeedback, `Downloaded file #${fileId}.`, "success");
        addActivity("success", "File downloaded", `File id #${fileId}`);
    } catch (error) {
        const message = getMessage(error);
        setFeedback(elements.downloadFeedback, message, "error");
        addActivity("error", "Download failed", message);
    }
}

function uploadFile(file) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${state.apiBase}/files/upload`);
        xhr.setRequestHeader("Authorization", `Bearer ${state.token}`);

        xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percent);
            }
        });

        xhr.addEventListener("load", () => {
            try {
                const payload = xhr.responseText ? JSON.parse(xhr.responseText) : {};
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(payload);
                    return;
                }
                reject(new Error(payload.error || "Upload failed."));
            } catch (error) {
                reject(new Error("Upload failed."));
            }
        });

        xhr.addEventListener("error", () => reject(new Error("Could not reach the upload endpoint.")));
        xhr.send(formData);
    });
}

async function requestJson(path, options = {}, useAuth = true) {
    const response = await fetch(composeUrl(path), buildRequestOptions(options, useAuth));
    if (!response.ok) {
        throw new Error(await readError(response));
    }
    return response.json();
}

async function requestText(path, options = {}, useAuth = false) {
    const response = await fetch(composeUrl(path), buildRequestOptions(options, useAuth));
    if (!response.ok) {
        throw new Error(await readError(response));
    }
    return response.text();
}

function buildRequestOptions(options, useAuth) {
    const headers = new Headers(options.headers || {});
    if (useAuth && state.token) {
        headers.set("Authorization", `Bearer ${state.token}`);
    }
    return {
        ...options,
        headers
    };
}

async function readError(response) {
    const contentType = response.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
        const payload = await response.json();
        return payload.error || payload.message || `Request failed with status ${response.status}`;
    }

    const text = await response.text();
    return text || `Request failed with status ${response.status}`;
}

function composeUrl(path) {
    return `${normalizeBaseUrl(state.apiBase)}${path}`;
}

function normalizeBaseUrl(value) {
    return (value || "http://localhost:8080").trim().replace(/\/+$/, "");
}

function setFeedback(element, message, status) {
    element.textContent = message;
    element.className = `inline-feedback ${status}`;
}

function setNotice(message, status) {
    elements.globalNotice.textContent = message;
    elements.globalNotice.className = `notice-strip ${status}`;
}

function setUploadProgress(percent) {
    elements.uploadProgressBar.style.width = `${Math.max(0, Math.min(percent, 100))}%`;
}

function addActivity(status, title, detail) {
    state.activities.unshift({
        status,
        title,
        detail,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });

    state.activities = state.activities.slice(0, 12);
    persistActivities();
    renderActivities();
}

function persistActivities() {
    localStorage.setItem(STORAGE_KEYS.activities, JSON.stringify(state.activities));
}

function ensureSession(message) {
    if (state.token) {
        return true;
    }

    setNotice(message, "error");
    addActivity("error", "Authentication required", message);
    return false;
}

function readJson(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        return fallback;
    }
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / (1024 ** index);
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function getMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
