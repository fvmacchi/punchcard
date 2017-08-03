var fs = require('fs');
var async = require('async');
var uuid = require('uuid/v4');

var c = undefined;

var HOURS_DIR = "./hours/";

module.exports = function(controllers) {
  c = controllers;
  return exports;
};

exports.isOnTheClock = function(employee_id, callback) {
  return callback(false);
};

exports.punch_in = function(employee_id, callback) {
  var d = new Date();
  var punch_time = new Date(d.getTime());
  exports.getHoursFile(d, function(hours) {
    if(!(employee_id in hours)) {
      hours[employee_id] = [];
    }
    if(hours[employee_id].length > 0) {
      var latest_punch = hours[employee_id][hours[employee_id].length-1];
      // Still punched in
      if(!('punch_out' in latest_punch)) {
        return callback(false);
      }
    }
    var new_punch = {
      'id': exports.generateIntervalID(),
      'punch_in': punch_time.getTime()
    };
    hours[employee_id].push(new_punch);
    saveHoursFile(d, hours, function() {
      return callback(true, punch_time.getTime());
    });
  });
};

exports.punch_out = function(employee_id, callback) {
  var d = new Date();
  var punch_time = new Date(d.getTime());
  var week_before = new Date(d.getTime());
  week_before.setDate(week_before.getDate()-7);
  var hours = undefined;
  async.series([
    function(callback) {
      exports.getHoursFile(week_before, function(result) {
        if(!(employee_id in result)) {
          return callback();
        }
        employee_hours = result[employee_id]
        last_punch = employee_hours[employee_hours.length-1];
        if('punch_out' in last_punch) {
          return callback();
        }
        hours = result;
        d = week_before;
        return callback(true)
      });
    },
    function(callback) {
      exports.getHoursFile(d, function(result) {
        hours = result;
        return callback();
      });
    }
  ], function(err, results) {
    // If employee not in hours, or if hours array for employee is empty
    if(!(employee_id in hours) || !hours[employee_id]) {
      return callback(false);
    }
    var latest_punch = hours[employee_id][hours[employee_id].length-1];
    // If already punched out
    if('punch_out' in latest_punch) {
      return callback(false);
    }
    
    latest_punch.punch_out = punch_time.getTime();
    saveHoursFile(d, hours, function() {
      return callback(true, punch_time.getTime());
    });
  });
};

exports.hadNoLunch = function(employee_id, callback) {
  var d = new Date();
  exports.getHoursFile(d, function(hours) {
    if(!(employee_id in hours) || !hours[employee_id]) {
      return callback(false);
    }
    hours[employee_id][hours[employee_id].length-1].no_lunch = true;
    saveHoursFile(d, hours, function() {
      return callback(true);
    });
  });
};

var saveHoursFile = function(d, hours, callback) {
  var path = getHoursFilePath(d);
  fs.writeFile(path, JSON.stringify(hours, undefined, 4), function() {
    return callback();
  });
};
exports.saveHoursFile = saveHoursFile;

exports.getHoursFile = function(d, callback) {
  var hours_file = getHoursFilePath(d);
  async.series([
    function(callback) {
      fs.exists(HOURS_DIR, function(exists) {
        if(exists) {
          return callback();
        }
        fs.mkdir(HOURS_DIR, function() {
          return callback();
        });
      });
    },
    function(callback) {
      fs.exists(hours_file, function(exists) {
        if(exists) {
          return callback();
        }
        fs.writeFile(hours_file, '{}', function (err) {
          return callback();
        });
      });
    }
  ], function(err, results) {
    fs.readFile(hours_file, function(err, data) {
      return callback(JSON.parse(data));
    });
  });
};

exports.getHoursFiles = function(callback) {
  fs.readdir(HOURS_DIR, function(err, files) {
    files = files.filter(function(file) {
      return file.endsWith('.json');
    });
    var sortable = files.map(function(file) {
      return {
        time: (new Date(file.replace('.json',''))).getTime(),
        file: file
      };
    });
    sortable = sortable.sort(function(a, b) {
      return b.time-a.time;
    });
    files = sortable.map(function(o) {
      return o.file;
    });
    return callback(files);
  });
};

var getHoursFileName = function(d) {
  d = new Date(d.getTime());
  d.setDate(d.getDate() - d.getDay() + 1);
  var name = d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate();
  return name;
}

var getHoursFilePath = function(d) {
  path = HOURS_DIR + getHoursFileName(d) + ".json";
  return path;
};

exports.updateEmployeeHours = function(d, employee_id, intervals, callback) {
  exports.getHoursFile(d, function(hours) {
    if(!hours[employee_id]) {
      hours[employee_id] = [];
    }
    file_intervals = hours[employee_id];
    intervals.sort(function(a,b){return a.punch_in-b.punch_in});
    var new_intervals = [];
    hours[employee_id] = new_intervals;
    intervals.forEach(function(interval) {
      if(!interval.punch_in) {
        return;
      }
      var new_interval = file_intervals.find(function(e){return e.id && e.id==interval.id;});
      if(!new_interval) {
        new_interval = {
          'id': exports.generateIntervalID()
        };
      }
      new_intervals.push(new_interval);
      Object.keys(interval).forEach(function(key) {
        new_interval[key] = interval[key];
      });
      if(!interval.punch_out) {
        delete new_interval.punch_out;
      }
    });
    exports.saveHoursFile(d, hours, callback);
  });
};

exports.report = function(d, callback) {
  var reportDetails = {};
  var dateName = getHoursFileName(d);
  reportDetails.date = dateName;
  exports.getHoursFile(d, function(hours) {
    c.employees.getEmployees(function(employees) {
      reportDetails.employees = employees;
      employees.forEach(function(employee) {
        employee.hours = {};
        employee.hours.total = 0;
        employee.hours.day = new Array(7);
        employee.hours.intervals = {};
        employee.hours.intervals.day = new Array(7);
        for(var i = 0; i < 7; i++) {
          employee.hours.day[i] = 0;
          employee.hours.intervals.day[i] = [];
        }
        if(!(employee.id in hours)) {
          return;
        }
        hours[employee.id].forEach(function(punch) {
          var punch_complete = false;
          var punch_in = new Date(punch.punch_in);
          var punch_out = undefined;
          if('punch_out' in punch) {
            punch_complete = true;
            punch_out = new Date(punch.punch_out);
          }
          var day_of_week = punch_in.getDay();
          employee.hours.intervals.day[day_of_week].push(punch);
          if(!punch_complete) {
            punch_out = new Date();
          }
          var delta = punch_out.getTime() - punch_in.getTime()
          employee.hours.day[day_of_week] += delta;
          employee.hours.total += delta;
        });
      });
      applyHourlyRules(reportDetails);
      callback(reportDetails);
    });
  });
};

var applyHourlyRules = function(report) {
  
  report.employees.forEach(function(employee) {
    var hours = employee.hours.day;
    var intervals = employee.hours.intervals.day;
    var modifiers = new Array(7);
    employee.hours.modifiers = {'day':modifiers};
    
    for(var i = 0; i < 7; i++) {
      modifiers[i] = [];
      var nab_applied = false;
      var nl_applied = false;
      
      // Add 15 minutes for afternoon break
      intervals[i].forEach(function(interval) {
        if('punch_out' in interval) {
          var start = new Date(interval.punch_in);
          var end = new Date(interval.punch_out);
          var thresh_high = new Date(start.getTime());
          thresh_high.setMinutes(0);
          thresh_high.setHours(12);
          thresh_high.setSeconds(0);
          thresh_high.setMilliseconds(0);
          var thresh_low = new Date(thresh_high.getTime());
          thresh_low.setHours(start.getDay() == 5? 15 : 16);//4:15pm, 3:15pm on fridays
          thresh_low.setMinutes(45);
          if(start.getTime() < thresh_high.getTime()
          && end.getTime() > thresh_low.getTime() && !nab_applied) {
            nab_applied = true;
            hours[i] += 15 *60*1000;//Add 15 minutes
            employee.hours.total += 15 *60*1000;
            modifiers[i].push('NAB');
          }
        }
      });
      
      // Check if selected "no lunch"
      intervals[i].forEach(function(interval) {
        if(interval.no_lunch) {
          nl_applied = true;
        }
      });
      
      if(!nl_applied) {
        // Subtract 30 minutes for lunch
        intervals[i].forEach(function(interval) {
          if('punch_out' in interval) {
            var start = new Date(interval.punch_in);
            var end = new Date(interval.punch_out);
            var thresh_high = new Date(start.getTime());
            thresh_high.setMinutes(0);
            thresh_high.setHours(12);
            thresh_high.setSeconds(0);
            thresh_high.setMilliseconds(0);
            var thresh_low = new Date(thresh_high.getTime());
            thresh_low.setHours(13);
            thresh_low.setMinutes(0);
            if(start.getTime() < thresh_high.getTime()
            && end.getTime() > thresh_low.getTime()) {
              hours[i] -= 30 *60*1000;//Subtract 30 minutes
              employee.hours.total -= 30 *60*1000;
              modifiers[i].push('SL');
            }
          }
        });
      }
      
      
      
    }
  });
  
  return report;
};

exports.generateIntervalID = function() {
  return uuid();
};