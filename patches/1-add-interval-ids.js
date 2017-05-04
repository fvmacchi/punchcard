var async = require('async');
var c = require(__dirname+'/../controllers')();


c.time.getHoursFiles(function(files) {
  if(!files) {
    return;
  }
  async.eachSeries(files, function(file, callback) {
    file = file.replace('.json', '');
    var d = new Date(file);
    c.time.getHoursFile(d, function(hours) {
      Object.keys(hours).forEach(function(employee_id) {
        hours[employee_id].forEach(function(interval) {
          if(!interval.id) {
            interval.id = c.time.generateIntervalID();
          }
        });
      });
      c.time.saveHoursFile(d, hours, function() {
        callback();
      });
    });
  });
});
