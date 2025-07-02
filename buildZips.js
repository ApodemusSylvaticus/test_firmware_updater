#!/usr/bin/env node
/**
 * buildZips.js
 *
 * Automatically:
 * 1) Finds each subdirectory under ./lambda (treated as a separate Lambda).
 * 2) Runs npm install in that subdirectory (if package.json is present).
 * 3) Creates a zip file for each subdirectory and places it in ./lambdaZips.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

// Folders
const LAMBDA_DIR = path.resolve(__dirname, 'lambda');
const DIST_DIR = path.resolve(__dirname, 'lambdaZips');

/**
 * Read all items in LAMBDA_DIR. Filter down to directories only.
 */
const lambdaNames = fs.readdirSync(LAMBDA_DIR).filter((name) => {
    const fullPath = path.join(LAMBDA_DIR, name);
    return fs.lstatSync(fullPath).isDirectory();
});

/**
 * Create a zip archive of a directory.
 *
 * @param {string} sourceDir  Absolute path of the directory to archive
 * @param {string} outZipPath Absolute path of the resulting .zip
 */
function zipDirectory(sourceDir, outZipPath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outZipPath);
        const archive = archiver('zip', { zlib: { level: 9 } }); // level 9 = max compression

        output.on('close', () => {
            console.log(`✅ Created: ${outZipPath} (${archive.pointer()} bytes)`);
            resolve();
        });

        archive.on('error', (err) => reject(err));
        archive.pipe(output);

        // Add everything from sourceDir to the root of the archive
        archive.directory(sourceDir, false);
        archive.finalize();
    });
}

(async () => {
    try {
        // Ensure DIST_DIR exists
        if (!fs.existsSync(DIST_DIR)) {
            fs.mkdirSync(DIST_DIR);
        }

        console.log(`Found ${lambdaNames.length} Lambda directories.`);

        for (const name of lambdaNames) {
            const fullLambdaPath = path.join(LAMBDA_DIR, name);

            // 1) Run npm install
            console.log(`\n➡️  Installing dependencies in "${name}"...`);
            try {
                execSync('npm install', {
                    cwd: fullLambdaPath,
                    stdio: 'inherit',
                });
            } catch (err) {
                console.warn(`⚠️  npm install failed in "${name}": ${err.message}`);
                // continue with next lambda if you don't want to stop on error
            }

            // 2) Create the zip
            console.log(`➡️  Zipping folder "${name}"...`);
            const zipPath = path.join(DIST_DIR, `${name}.zip`);
            await zipDirectory(fullLambdaPath, zipPath);
        }

        console.log('\nAll zip archives are ready.');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();