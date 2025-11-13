import fs from 'fs';
import exec from 'child_process';

function extractDomain(line) {
    const match = line.match(/\b[a-z]{2}-[a-z]{3}-[a-z]+-\d{3}\b/);
    return match ? match[0] : null;
}

async function processMullvadList() {
    const list = [];
    exec.exec('mullvad relay list', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        list.push(stdout.split('\n'));

        const results = [];
        list[0].forEach(line => {
            const domain = extractDomain(line);
            if (domain && domain.includes('wg')) {
                results.push(domain);
            }
        });

        if (fs.existsSync('mullvad-relays.txt')) {
            fs.unlinkSync('mullvad-relays.txt');
        }

        if (results) {
            fs.writeFileSync('mullvad-relays.txt', results.join('\n'), 'utf8');
        }
    });
}

processMullvadList();
