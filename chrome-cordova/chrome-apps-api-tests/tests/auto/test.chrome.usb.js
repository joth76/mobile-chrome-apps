// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests("chrome.usb", function() {
  'use strict';

  var customMatchers = {
/*    toBeMediaStreamTrack : function(util, customEqualityTesters){
      return {
        compare : function(actual, expected){
          var result = {};
          result.pass = (actual.toString() == '[object MediaStreamTrack]');
          result.message = 'Expected ' + actual + ' to be a MediaStreamTrack.';
          return result;
        }
      }
    }, */
    toBeString : function(util, customEqualityTesters){
      return {
        compare : function(actual, expected){
          var result = {};
          result.pass = (typeof actual == 'string');
          result.message = 'Expected ' + actual + ' to be a string.';
          return result;
        }
      }
    }
  }

  beforeEach(function(done) {
    jasmine.addMatchers(customMatchers);
    done();
  });

  it('should contain definitions', function() {
    expect(chrome.usb).toBeDefined();
    expect(chrome.usb.getDevices).toBeDefined();
    expect(chrome.usb.openDevice).toBeDefined();
    expect(chrome.usb.closeDevice).toBeDefined();
    expect(chrome.usb.listInterfaces).toBeDefined();
    expect(chrome.usb.claimInterface).toBeDefined();
    expect(chrome.usb.releaseInterface).toBeDefined();
  });

  it('should getDevices and open & close a device if present', function(done) {
    chrome.usb.getDevices({} /* Get all devices */, function(devices) {
      expect(chrome.runtime.lastError).not.toBeDefined();
      if (devices.length > 0) {
        chrome.usb.openDevice(devices[0], function(handle) {
          expect(chrome.runtime.lastError).not.toBeDefined();
          chrome.usb.closeDevice(handle);
          done();
        });
      } else {
        done();
      }
    });
  });

  it('should write and read to a fake device instance', function(done) {
    chrome.usb.getDevices({appendFakeDevice:true, productId: 0x2001},
        function(devices) {
      expect(chrome.runtime.lastError).not.toBeDefined();
      expect(devices.length).toBe(1);
      chrome.usb.openDevice(devices[0], function(handle) {
        expect(chrome.runtime.lastError).not.toBeDefined();
        chrome.usb.listInterfaces(handle, function(ifs) {
          var iface = ifs[0];
          expect(iface).toBeDefined();
          var inEp = iface.endpoints[0];
          var outEp = iface.endpoints[1];
          expect(inEp.direction).toBe("in");
          expect(outEp.direction).toBe("out");
          chrome.usb.claimInterface(handle, iface.interfaceNumber, function() {
            // Do a control transfer, just because.
            chrome.usb.controlTransfer(handle, {
              direction: "out",
              recipient: "interface",
              requestType: "standard",
              request: 1,
              value: 2,
              index: 3,
              data: new ArrayBuffer(2)
            }, function(info) {
              expect(chrome.runtime.lastError).not.toBeDefined();
              expect(info.resultCode).toBeDefined();
              expect(info.resultCode).toBe(0);
            });
            // Do a pair of bulk transfers, asserting the payload is echoed.
            chrome.usb.bulkTransfer(handle, {
              direction: "out",
              endpoint: outEp.address,
              data: (new Uint8Array([42, 43, 44])).buffer
            }, function(outResult) {
              expect(chrome.runtime.lastError).not.toBeDefined();
              expect(outResult.resultCode).toBeDefined();
              expect(outResult.resultCode).toBe(0);
              chrome.usb.bulkTransfer(handle, {
                direction: "in",
                endpoint: inEp.address,
                length: 10
              }, function(inResult) {
                expect(chrome.runtime.lastError).not.toBeDefined();
                expect(outResult.resultCode).toBeDefined();
                expect(outResult.resultCode).toBe(0);
                var r = new Uint8Array(inResult.data);
                expect(r.length).toBe(3);
                expect(r[0]).toBe(42);

                chrome.usb.closeDevice(handle);
                done();
              });
            });
          });
        });
      });
    });
  });

});
