var fs = require('fs');
var path = require('path')

var employees_file = './employees.json';

var c = undefined;
var employees = undefined;
var employeesMap = undefined;

module.exports = function(controllers) {
  c = controllers;
  fs.exists(employees_file, function (exists) {
    if(!exists){
      fs.writeFile(employees_file, {flag: 'wx'}, function (err, data) {
          exports.loadEmployees();
      });
    } else {
      exports.loadEmployees();
    }
  });
  return exports;
};

exports.loadEmployees = function() {
  fs.readFile(employees_file, function(err, data) {
    if(err) {
      console.log(err);
      return;
    }
    try {
      employees = JSON.parse(data);
    } catch(e) {
      employees = []
    }
    employeesMap = {};
    employees.forEach(function(employee) {
      employeesMap[employee.id] = employee;
      registerBarcodeMeta(employee);
    });
  });
};

exports.getEmployees = function(callback) {
  var e = JSON.parse(JSON.stringify(employees));
  e.sort(function(a,b) {
    return (a.firstName+" "+a.lastName).localeCompare(b.firstName+" "+b.lastName);
  });
  return callback(e); 
};

exports.getEmployee = function(id, callback) {
  return callback(employeesMap[id]);
};

exports.saveEmployees = function(callback) {
  fs.writeFile(employees_file, JSON.stringify(employees, undefined, 4), function(err) {
    if(err) {
      console.log(err);
    }
    return callback && callback()
  });
};

exports.addEmployee = function(employee, callback) {
  employee.id = c.barcodes.newBarcode();
  employee.punch_in_id = c.barcodes.newBarcode();
  employee.punch_out_id = c.barcodes.newBarcode();
  employee.view_hours_id = c.barcodes.newBarcode();
  employee.no_lunch_id = c.barcodes.newBarcode();
  employees.push(employee);
  registerBarcodeMeta(employee);
  exports.saveEmployees(callback);
};

exports.updateEmployee = function(employee, callback) {
  if(!('id' in employee)) {
    return exports.addEmployee(employee, callback);
  } else {
    var id = employee.id;
    Object.keys(employee).forEach(function(key) {
      employeesMap[id][key] = employee[key];
    });
    return exports.saveEmployees(callback);
  }
}

exports.updateEmployees = function(callback) {
  employees.forEach(function(employee) {
    var barcodes = ['punch_in_id', 'punch_out_id', 'view_hours_id', 'no_lunch_id'];
    barcodes.forEach(function(barcode) {
      if(!employee[barcode]) {
        employee[barcode] = c.barcodes.newBarcode();
      }
    });
  });
  exports.saveEmployees(callback);
};

var registerBarcodeMeta = function(employee) {
  c.barcodes.addBarcodeMeta(employee.id, {
    employee: employee
  });
  c.barcodes.addBarcodeMeta(employee.punch_in_id, {
    employee: employee,
    action: "punch_in"
  });
  c.barcodes.addBarcodeMeta(employee.punch_out_id,  {
    employee: employee,
    action: "punch_out"
  });
  c.barcodes.addBarcodeMeta(employee.view_hours_id, {
    employee: employee,
    action: "view_hours"
  });
  c.barcodes.addBarcodeMeta(employee.no_lunch_id, {
    employee: employee,
    action: "no_lunch"
  });
};

