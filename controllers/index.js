module.exports = function() {
  var c = {}
  
  c.employees = require('./employees')(c);
  c.barcodes = require('./barcodes')(c);
  c.time = require('./time')(c);
  
  return c;
}