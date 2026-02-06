/**
 * Shelly Simulator
 *
 * Simulated Shelly environment for running shelly_code.js on PC.
 * Supports schedules, switch state, and real HTTP GET.
 *
 * Usage: Copy shelly_code.js contents after this file and run with Node.js:
 *   node shelly_simulator.js
 */

console.log("Shelly simulator initialized.");

// --- Global utilities ---
global.print = (...args) => console.log(...args);

global.Timer = {
  set(ms, repeat, cb) {
    return repeat ? setInterval(cb, ms) : setTimeout(cb, ms);
  }
};

// --- In-memory Shelly emulation ---
let simulatedSchedules = [];
let scheduleNextId = 1;
let simulatedSwitchState = false;

// --- Real HTTP GET using fetch() ---
async function realHttpGet(url, callback = () => {}) {
  print("[SIM] Performing REAL HTTP GET:", url);
  try {
    let response = await fetch(url);
    let body = await response.text();
    callback({ body }, 0, null);
  } catch (err) {
    callback(null, 1, err.toString());
  }
}

// --- Simulated Shelly.call() ---
global.Shelly = {
  call(method, params = {}, callback = () => {}) {
    print(`[SIM] Shelly.call("${method}")`, params);

    switch (method) {

      // --- Schedule API ---
      case "Schedule.List":
        callback({ jobs: simulatedSchedules.slice() }, 0, null);
        return;

      case "Schedule.Create":
        simulatedSchedules.push({
          id: scheduleNextId++,
          ...params
        });
        callback({ ok: true }, 0, null);
        return;

      case "Schedule.Delete":
        simulatedSchedules = simulatedSchedules.filter(j => j.id !== params.id);
        callback({ ok: true }, 0, null);
        return;

      // --- Switch API ---
      case "Switch.GetStatus":
        callback({ output: simulatedSwitchState }, 0, null);
        return;

      case "Switch.Set":
        simulatedSwitchState = params.on === true;
        callback({ ok: true }, 0, null);
        return;

      // --- Real HTTP GET ---
      case "http.get":
        realHttpGet(params.url, callback);
        return;

      default:
        callback(null, 1, "Unknown Shelly method: " + method);
        return;
    }
  }
};

module.exports = {};
