const board = document.querySelector("#catalog-photos");
const imageExtensions = /\.(avif|gif|jpe?g|png|webp)$/i;
let renderedPhotoKey = "";

function cleanPhotoPath(folder, href) {
    const folderUrl = new URL(folder, window.location.href);
    const url = new URL(href, folderUrl);

    if (!imageExtensions.test(url.pathname)) {
        return "";
    }

    if (!url.pathname.includes(`/${folder}`)) {
        return "";
    }

    return `${folder}${decodeURIComponent(url.pathname.split(`/${folder}`).pop())}`;
}

async function loadPhotosFromManifest(folder) {
    const response = await fetch(`${folder}photos.json`, { cache: "no-store" });

    if (!response.ok) {
        return [];
    }

    const data = await response.json();
    const photos = Array.isArray(data) ? data : data.photos;

    if (!Array.isArray(photos)) {
        return [];
    }

    return photos
        .filter((photo) => typeof photo === "string" && imageExtensions.test(photo))
        .map((photo) => photo.startsWith(folder) ? photo : `${folder}${photo}`);
}

async function loadPhotosFromFolder(folder) {
    const response = await fetch(folder, { cache: "no-store" });

    if (!response.ok) {
        return [];
    }

    const html = await response.text();
    const page = new DOMParser().parseFromString(html, "text/html");

    return [...page.querySelectorAll("a")]
        .map((link) => cleanPhotoPath(folder, link.getAttribute("href") || ""))
        .filter(Boolean)
        .sort();
}

async function loadCatalogPhotos(folder) {
    const manifestPhotos = await loadPhotosFromManifest(folder).catch(() => []);

    if (manifestPhotos.length > 0) {
        return manifestPhotos;
    }

    return loadPhotosFromFolder(folder).catch(() => []);
}

function photoStyle(index) {
    const tilts = [-8, 5, -4, 7, -10, 4, 11, -6, 8, -3];
    const lifts = [0, -10, 8, -4, 12, -8, 4, 10, -12, 6];
    const widths = [150, 190, 135, 210, 160, 180, 125, 200, 145, 170];

    return {
        tilt: `${tilts[index % tilts.length]}deg`,
        lift: `${lifts[index % lifts.length]}px`,
        width: `${widths[index % widths.length]}px`
    };
}

function renderPhotos(photos) {
    const nextPhotoKey = photos.join("|");

    if (!board || nextPhotoKey === renderedPhotoKey) {
        return;
    }

    renderedPhotoKey = nextPhotoKey;
    board.querySelectorAll(".catalog-photo-frame").forEach((photo) => photo.remove());
    board.classList.toggle("has-photos", photos.length > 0);

    photos.forEach((photo, index) => {
        const frame = document.createElement("div");
        const img = document.createElement("img");
        const style = photoStyle(index);

        frame.className = "catalog-photo-frame";
        frame.style.setProperty("--tilt", style.tilt);
        frame.style.setProperty("--lift", style.lift);
        frame.style.setProperty("--photo-width", style.width);

        img.src = photo;
        img.alt = "Laguna gal catalog photo";
        img.loading = "lazy";

        img.addEventListener("load", () => {
            const ratio = img.naturalWidth / img.naturalHeight;

            frame.classList.toggle("wide", ratio > 1.25);
            frame.classList.toggle("tall", ratio < 0.8);
            frame.classList.toggle("square", ratio >= 0.8 && ratio <= 1.25);
        });

        frame.appendChild(img);
        board.appendChild(frame);
    });
}

async function refreshCatalog() {
    if (!board) {
        return;
    }

    const folder = board.dataset.photoFolder || "catalog-photos/";
    const photos = await loadCatalogPhotos(folder);

    renderPhotos(photos);
}

refreshCatalog();
setInterval(refreshCatalog, 10000);
