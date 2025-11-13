import exec from 'child_process';
import fs from 'fs';

/**
 * Sleep for a set time
 * 
 * 1 000 = 1s 
 * 10 000 = 10s
 * 100 000 = 100s / 1 min 40s
 * 1 000 000 = 1 000s /  16 min 40s
 * 
 * @param {*} ms 
 * @returns 
 */
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Read Mullvad relay list and push them into 'relay'-list.
let relays = [];
try {
    const data = fs.readFileSync('../mullvad-vpn-relay-list-parser/mullvad-relays.txt', { encoding: 'utf8' });
    relays = data.split('\n');
} catch (err) {
    console.error('Error reading file:', err);
}

// Returns if the an Mullvad is connected or not
async function getConnectionStatus() {
    let status = ''
    try {
        exec.exec('mullvad status', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                return;
            }
            status = stdout.split('\n')[0];
        })
    } catch (error) {
        console.error(error);
    }

    // Wait 0,5s for child process to complete
    await sleep(500);
    return status;
}

// Gets current relay
function getCurrentRelay() {
    exec.exec('mullvad status', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        
        return stdout.split('\n')[1].split(' ')[22];
    })
}

// Picks random relay, and check if it is in use. 
// If is not the current relay, it returns it.
async function getNewRandomRelay() {
    try {
        const currentRelay = getCurrentRelay()
        let newRelay = currentRelay;

        while (newRelay == currentRelay) {
            newRelay = relays[Math.floor(Math.random() * relays.length)]
        }
        
        return newRelay;
    } catch (error) {
        console.error(error);
    }
}

/**
 * Switches to a new random Mullvad relay
 */
export default async function switchMullvadRelay() {
    const randomRelay = await getNewRandomRelay();
    
    try {
        exec.exec('mullvad relay set location ' + randomRelay, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                return;
            }           
        })

        await sleep(500);

    } catch (error) {
        console.error(error);
    } finally {
        let connStatus = await getConnectionStatus();

        // Wait until connected
        while (connStatus != "Connected") {
            await sleep(1000);
            connStatus = await getConnectionStatus();
        }

        // Get IP
        const response = await fetch('https://api.ipify.org?format=json');
        const html = await response.text();
        const json = JSON.parse(html);
        console.log("Mullvad relay set to: " + randomRelay + " with ip: " + json["ip"]);
    }
}
