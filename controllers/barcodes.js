var randomID = require('random-id');

var c = undefined;

var barcodes = new Set();

var barcodeMeta = {};

module.exports = function(controllers) {
  c = controllers;
  
  return exports;
};

exports.getMeta = function(barcode_id, callback) {
    callback(barcodeMeta[barcode_id]);
};

exports.addBarcode = function(barcode_id) {
  barcodes.add(barcode_id);
};

exports.addBarcodeMeta = function(barcode_id, meta) {
  barcodes.add(barcode_id);
  barcodeMeta[barcode_id] = meta;
};

exports.isBarcodeUsed = function(barcode_id) {
  return barcodes.has(barcode_id);
};

exports.newBarcode = function() {
  var id = undefined;
  while(!id || exports.isBarcodeUsed(id)) {
    id = randomID(12, '0');
  }
  exports.addBarcode(id);
  return id;
};
