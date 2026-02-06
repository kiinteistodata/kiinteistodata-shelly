/**
 * Kiinteistodata Shelly Relay Controller
 *
 * Fetches booking timings from the Kiinteistodata API and
 * programs on/off schedules onto a Shelly Gen2 relay device.
 *
 * The API already handles pre_time, post_time, merge_gap and sorting.
 * This script simply fetches the ready timings and applies them.
 *
 * Based on: https://github.com/juimonen/sauna_shelly (BSD-3-Clause, Jaska Uimonen)
 */

// --- Configuration ---
let PROPERTY_ID = "xxxxxxxxx";
let CALENDAR_ID = "xxxxxxxxx";
let RESOURCE_ID = "xxxxxxxxx";
let API_KEY     = "xxxxxxxxx";
let API_URL     = "https://api.kiinteistodata.fi/open-api-v1/properties";

let POLL_INTERVAL_MS = 5 * 60 * 1000;  // polling interval in milliseconds
let DAYS_AHEAD       = 7;             // how many days ahead to fetch
let NIGHT_START_HOUR = 23;            // pause polling at this hour
let NIGHT_END_HOUR   = 5;             // resume polling at this hour

let lastAppliedTimings = null;

// --- Helpers ---
function pad2(n) { return n < 10 ? "0" + n : "" + n; }

function formatDate(d) {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

let DOW_MAP = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function safeDate(str) {
  let d = new Date(str);
  if (isNaN(d.getTime())) {
    print("Invalid date:", str);
    return null;
  }
  return d;
}

function toCronString(isoString) {
  let d = safeDate(isoString);
  if (!d) return "0 0 0 * * MON";
  return d.getSeconds() + " " + d.getMinutes() + " " + d.getHours() + " * * " + DOW_MAP[d.getDay()];
}

function isPollingAllowed() {
  let hr = new Date().getHours();
  return !(hr >= NIGHT_START_HOUR || hr < NIGHT_END_HOUR);
}

// --- Build API URL (rolling window from today) ---
function buildApiUrl() {
  let now = new Date();
  let end = new Date(now.getTime() + DAYS_AHEAD * 86400000);

  return API_URL + "/" + PROPERTY_ID +
         "/modern-booking-calendars/" + CALENDAR_ID +
         "/resources/" + RESOURCE_ID +
         "/timings/" + formatDate(now) + "/" + formatDate(end) +
         "/?api_key=" + API_KEY;
}

// --- Validate timings from API ---
function validateTimings(timings) {
  if (!timings || timings.length === 0) return [];

  let valid = [];
  for (let i = 0; i < timings.length; i++) {
    let on = safeDate(timings[i].on);
    let off = safeDate(timings[i].off);
    if (on && off) {
      valid.push({ on: timings[i].on, off: timings[i].off });
    }
  }
  return valid;
}

// --- Enforce correct relay state right now ---
function enforceCurrentState(timings) {
  let now = Date.now();
  let shouldBeOn = false;

  for (let i = 0; i < timings.length; i++) {
    let on = new Date(timings[i].on).getTime();
    let off = new Date(timings[i].off).getTime();
    if (now >= on && now < off) {
      shouldBeOn = true;
      break;
    }
  }

  Shelly.call("Switch.GetStatus", { id: 0 }, function (res, errCode, errMsg) {
    if (errCode !== 0 || !res) {
      print("ERROR reading switch status:", errMsg);
      return;
    }

    let isOn = res.output === true;

    if (shouldBeOn && !isOn) {
      print("Should be ON, switching ON.");
      Shelly.call("Switch.Set", { id: 0, on: true });
    } else if (!shouldBeOn && isOn) {
      print("Should be OFF, switching OFF.");
      Shelly.call("Switch.Set", { id: 0, on: false });
    } else {
      print("State OK (" + (isOn ? "ON" : "OFF") + ")");
    }
  });
}

// --- Apply schedules to device ---
function applySchedules(timings) {
  if (!timings || timings.length === 0) {
    print("No timings, enforcing OFF.");
    Shelly.call("Switch.Set", { id: 0, on: false });
    return;
  }

  print("Applying " + timings.length + " timing pairs...");

  // First delete all existing schedules, then create new ones
  Shelly.call("Schedule.List", {}, function (res, errCode, errMsg) {
    if (errCode !== 0 || !res || !res.jobs) {
      print("Schedule.List error:", errMsg);
      createJobs();
      return;
    }

    let jobsToDelete = res.jobs.slice();
    let di = 0;

    function deleteNext() {
      if (di >= jobsToDelete.length) {
        createJobs();
        return;
      }
      let jobId = jobsToDelete[di++].id;
      Shelly.call("Schedule.Delete", { id: jobId }, function () {
        Timer.set(200, false, deleteNext);
      });
    }

    deleteNext();
  });

  function createJobs() {
    let jobs = [];
    for (let i = 0; i < timings.length; i++) {
      jobs.push({
        enable: true,
        timespec: toCronString(timings[i].on),
        calls: [{ method: "Switch.Set", params: { id: 0, on: true } }]
      });
      jobs.push({
        enable: true,
        timespec: toCronString(timings[i].off),
        calls: [{ method: "Switch.Set", params: { id: 0, on: false } }]
      });
    }

    let i = 0;
    function createNext() {
      if (i >= jobs.length) {
        lastAppliedTimings = JSON.parse(JSON.stringify(timings));
        print("All " + jobs.length + " schedules applied.");
        printSchedule(timings);
        enforceCurrentState(timings);
        return;
      }
      Shelly.call("Schedule.Create", jobs[i++], function () {
        Timer.set(200, false, createNext);
      });
    }

    createNext();
  }
}

// --- Display ---
function printSchedule(timings) {
  for (let i = 0; i < timings.length; i++) {
    let on = safeDate(timings[i].on);
    let off = safeDate(timings[i].off);
    if (!on || !off) continue;
    print("  ON:", formatDate(on), pad2(on.getHours()) + ":" + pad2(on.getMinutes()),
          "OFF:", formatDate(off), pad2(off.getHours()) + ":" + pad2(off.getMinutes()));
  }
}

// --- Main sync ---
function sync() {
  if (!isPollingAllowed()) {
    print("Night mode, enforcing OFF.");
    Shelly.call("Switch.Set", { id: 0, on: false });
    return;
  }

  let url = buildApiUrl();

  Shelly.call("http.get", { url: url }, function (res, errCode, errMsg) {
    if (errCode !== 0) {
      print("HTTP error:", errMsg);
      return;
    }

    let data;
    try { data = JSON.parse(res.body); }
    catch (e) { print("JSON parse error:", e); return; }

    if (!data || !Array.isArray(data.timings)) {
      print("Invalid API response.");
      return;
    }

    let timings = validateTimings(data.timings);

    if (timings.length === 0) {
      print("No timings, enforcing OFF.");
      Shelly.call("Switch.Set", { id: 0, on: false });
      lastAppliedTimings = null;
      return;
    }

    if (lastAppliedTimings && JSON.stringify(timings) === JSON.stringify(lastAppliedTimings)) {
      print("No changes.");
      return;
    }

    print("Changes detected, updating schedules...");
    applySchedules(timings);
  });
}

// --- Start ---
sync();
Timer.set(POLL_INTERVAL_MS, true, sync);
