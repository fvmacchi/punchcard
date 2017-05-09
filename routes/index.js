var express = require('express');
var router = express.Router();

var c = undefined;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/barcodes', function(req, res, next) {
  c.employees.getEmployees(function(employees) {
    res.render('barcodes', { employees: employees });
  });
});

router.get('/employee/edit', function(req, res, next) {
  res.render('edit-employee',{});
});

router.get('/employee/update', function(req, res, next) {
  c.employees.updateEmployees(function() {
    res.redirect('/');
  });
});

router.post('/employee/edit', function(req, res, next) {
  c.employees.updateEmployee(req.body, function() {
    res.redirect('/');
  })
});

router.post('/barcode', function(req, res, next) {
  var barcode_id = req.body.barcode_id;
  c.barcodes.getMeta(barcode_id, function(meta) {
    if(!meta) {
      return;
    }
    var employee = meta.employee;
    if(meta.action == "punch_in") {
      c.time.punch_in(meta.employee.id, function(success, time) {
        console.log(success)
        return res.send({
            action: 'punch_in',
            time: time,
            status: success ? 'success' : 'fail',
            employee: employee
        });
      });
    } else if (meta.action == "punch_out") {
      c.time.punch_out(meta.employee.id, function(success, time) {
        return res.send({
          action: 'punch_out',
          time: time,
          status: success ? 'success' : 'fail',
          employee: employee
        });
      });
    } else if (meta.action == "no_lunch") {
      c.time.hadNoLunch(meta.employee.id, function(success) {
        return res.send({
          action: 'no_lunch',
          status: success ? 'success' : 'fail',
          employee: employee
        });
      });
    }
  });
});

router.get('/report', function(req, res, next) {
  c.time.getHoursFiles(function(files) {
    reports = files.map(function(file) {
      return file.replace('.json', '');
    });
    
    res.render('report-select', {
      reportDates: reports
    });
  });
});

router.get('/report/:date', function(req, res, next) {
  date = req.params.date;
  c.time.report(new Date(date), function(reportDetails) {
    res.render('report', {
      reportDetails: reportDetails
    });
  });
});

router.post('/report/:date/:employee', function(req, res, next) {
  var date = req.params.date;
  var d = new Date(date);
  var employee_id = req.params.employee;
  var intervals = JSON.parse(req.body.intervals);
  
  c.time.updateEmployeeHours(d, employee_id, intervals, function() {
    res.redirect('/report/' + date);
  });
});

module.exports = function(controllers) {
  c = controllers;
  return router;
};
