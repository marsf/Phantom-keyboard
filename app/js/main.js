// Copyright (c) 2016, Masahiko Imanaka. All rights reserved.
/* jshint moz:true, esnext:true */

(function() {
'use strict';

// Dummy set of mozInputMethod.
if (!window.navigator.mozInputMethod) {
  window.navigator.mozInputMethod = {
    inputcontext: null,
    mgmt: {
      hide: function mgmt_hide() {},
      next: function mgmt_next() {},
      showAll: function mgmt_showAll() {}
    }
  };
}


var inputCtx = null,
    mgmt = window.navigator.mozInputMethod.mgmt;

var keyboardElement = document.getElementById('keyboard'),
    toggleModeButton = document.getElementById('toggleMode'),
    controlButtons = document.getElementById('controls'),
    cachedWindowHeight = keyboardElement.availHeight,
    cachedWindowWidth = keyboardElement.availWidth;

var prevTextLength = 0;

function phantomInit() {
  window.removeEventListener('load', phantomInit);
  navigator.mozInputMethod.oninputcontextchange = resizeWindow;
  controlButtons.addEventListener('click', ctrlHandler, false);
  resizeWindow();

  // Kana mode is messy.
  toggleModeButton.style.display = "none";
}


function phantomQuit() {
  window.removeEventListener('unload', phantomQuit);
  controlButtons.removeEventListener('load', ctrlHandler, false);
}


function getInputContext() {
  inputCtx = navigator.mozInputMethod.inputcontext;
  if (inputCtx !== null) {
    if (inputCtx.hardwareinput) {
      // inputcontext.hardwareinput is supported in 48.0 or later. (Bug 1110030)
      console.log('Hardware input is enabled.');
      inputCtx.hardwareinput.addEventListener('input', hookInputs);
    } else {
      inputCtx.onsurroundingtextchange = hookInputs;
    }
  }
}

function resizeWindow() {
  window.resizeTo(cachedWindowWidth, cachedWindowHeight);
  getInputContext();
}


function ctrlHandler(evt) {
  evt.preventDefault();
  switch (evt.target.id) {
    case 'switchLayout':
      mgmt.showAll();
      break;
    case 'toggleMode':
      toggleMode();
      break;
    default:
  }
}


function toggleMode() {
  var modeList = ['EISU', 'KANA'];
  var modeIndicator = {'EISU': 'Ａ', 'KANA': 'か'};

  var currentMode = toggleModeButton.getAttribute('mode'),
      newMode = (currentMode == modeList[0]) ? modeList[1] : modeList[0];
  toggleModeButton.setAttribute('mode', newMode);
  toggleModeButton.textContent = modeIndicator[newMode];
  console.log('Mode is changed to', newMode);
}


function hookInputs(evt) {
  var evtDetail = evt.detail;
  //console.log('hookInputs', evtDetail);

  if (!inputCtx || evtDetail.ownAction) {
    return;
  }

  // For Kana input mode.
  var currentTextLength = evtDetail.beforeString.length + evtDetail.afterString.length;

  var mode = toggleModeButton.getAttribute('mode');
  if (mode === 'KANA') {
    if (prevTextLength >= currentTextLength) {
      return;
    } else {
      prevTextLength = currentTextLength;
    }
  
    var beforeText = (inputCtx.textBeforeCursor).slice(-3);
    if (beforeText.length < 1) {
      return;
    }
    // Allow kana layout input by mapped kana character.
    var ch = beforeText.slice(-1);
    if (ch in KeyMap) {
      console.log(ch,'is mapped to', KeyMap[ch]);
      if (beforeText.length > 1) {
        var transCh = '';
        switch (ch) {
          case '@': // to voiced mark.
            transCh = addVoicedMark(beforeText.slice(-2, -1));
            break;
          case '[': // to semi-voiced mark.
            transCh = addSemiVoicedMark(beforeText.slice(-2, -1));
            break;
          default:
        }
        if (transCh.length > 0) {
          inputCtx.replaceSurroundingText(transCh, -2, 2);
        } else {
          inputCtx.replaceSurroundingText(KeyMap[ch], -1, 1);
        }
      } else {
        inputCtx.replaceSurroundingText(KeyMap[ch], -1, 1);
      }
    }
  }
}


function addVoicedMark(ch) {
  var chCode = ch.charCodeAt(0);
  if (0x304b <= chCode && chCode <= 0x3062) {
    if ((chCode % 2) === 1) {
      chCode++;  // か～ち -> が～ぢ
    }
  } else if (0x3064 <= chCode && chCode <= 0x3069) {
    if ((chCode % 2) === 0) {
      chCode++;  // つ～と -> づ～ど
    }
  } else if (0x306f <= chCode && chCode <= 0x307d) {
    if (((chCode - 0x306e) % 3) === 1) {
      chCode++;  // は～ほ -> ば～ぼ
    }
  } else if (chCode === 0x3046) {
    chCode = 0x3094;  // う -> ゔ
  } else if (chCode === 0x309d) {
    chCode++;  // ゝ -> ゞ
  } else {
    return '';
  }
  return String.fromCharCode(chCode);
}


function addSemiVoicedMark(ch) {
  var chCode = ch.charCodeAt(0);
  if (0x306f <= chCode && chCode <= 0x307d) {
    if (((chCode - 0x306e) % 3) === 1) {
      chCode += 2;  // は～ほ -> ぱ～ぽ
    }
  } else {
    return '';
  }
  return String.fromCharCode(chCode);
}


/*
// Send key code to textbox.
function sendKeyCode(aKeyCode, isSpecial) {
  try {
    if (isSpecial) {
      inputCtx.sendKey(aKeyCode, 0, 0);
    } else {
      inputCtx.sendKey(0, aKeyCode, 0);
    }
  } catch(err) {
    console.error(err);
  }
}
*/

// Modified OADG 109 Keyboard Layout
var KeyMap = {
  // normal
  '1': 'ぬ', '2': 'ふ', '3': 'あ', '4': 'う', '5': 'え', '6': 'お', '7': 'や', '8': 'ゆ', '9': 'よ', '0': 'わ', '-': 'ほ', '^': 'へ', '|': 'ー', 
  'q': 'た', 'w': 'て', 'e': 'い', 'r': 'す', 't': 'か', 'y': 'ん', 'u': 'な', 'i': 'に', 'o': 'ら', 'p': 'せ', '@': '゛', '[': '゜',
  'a': 'ち', 's': 'と', 'd': 'し', 'f': 'は', 'g': 'き', 'h': 'く', 'j': 'ま', 'k': 'の', 'l': 'り', ';': 'れ', ':': 'け', ']': 'む',
  'z': 'つ', 'x': 'さ', 'c': 'そ', 'v': 'ひ', 'b': 'こ', 'n': 'み', 'm': 'も', ',': 'ね', '.': 'る', '/': 'め', '\\': 'ろ',
  // Shift+
  '#': 'ぁ', '$': 'ぅ', '%': 'ぇ', '&': 'ぉ', '\'': 'ゃ', '(': 'ゅ', ')': 'ょ', '~': 'を',
  'E': 'ぃ', 'P': '『', '{': '「', '+': '』', '*': 'ヶ', '}': '」', 'Z': 'っ', '<': '、', '>': '。', '?': '・',
  ' ': '　'
};



window.addEventListener('load', phantomInit);
window.addEventListener('unload', phantomQuit);

})(window);

