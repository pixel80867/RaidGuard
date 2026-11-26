const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = process.env.DATA_DIR || "/data";

const filePath = path.join(
    dataDirectory,
    "lockdown.json"
);

// LOAD SAVED PERMISSIONS
function loadLockdown() {
    try {
        const data = fs.readFileSync(filePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        if (error.code === "ENOENT") {
            return {};
        }

        throw error;
    }
}

// SAVE ORIGINAL PERMISSIONS
function saveLockdown(data) {
    fs.mkdirSync(dataDirectory, {
        recursive: true
    });

    const temporaryFile = filePath + ".tmp";

    fs.writeFileSync(
        temporaryFile,
        JSON.stringify(data, null, 2),
        { mode: 0o600 }
    );

    fs.renameSync(temporaryFile, filePath);
}

// EXPORT STORAGE FUNCTIONS
module.exports = {
    loadLockdown,
    saveLockdown
};
