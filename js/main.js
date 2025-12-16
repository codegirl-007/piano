// Constants
var DELAY = 0; // play one note every quarter second
var VELOCITY = 127; // how hard the note hits
var ACTIVE_FEEDBACK_DURATION = 200; // milliseconds
var NOTE_DURATION = 750; // milliseconds - how long a note plays
var NOTE_OFF_DELAY = 0.75; // seconds - delay before note stops

// Cached DOM elements and key mappings
var pianoElement = null;
var keyElementsMap = new Map(); // Maps note number to DOM element
var activeNotes = new Set(); // Track currently playing notes to prevent duplicates
var pressedKeys = new Set(); // Track currently pressed keyboard keys to prevent repeat
var activeTimeouts = new Map(); // Track timeouts for cleanup

// Web MIDI API support
var midiAccess = null;
var midiInputs = new Map(); // Track connected MIDI input devices
var midiDeviceStatus = {
  supported: false,
  connected: false,
  deviceCount: 0
};

// Keyboard mapping: lowercase key -> MIDI note (normalized in parseAction)
var KEYBOARD_MAP = {
  'q': 60, // C4
  'w': 62, // D4
  'e': 64, // E4
  'r': 65, // F4
  't': 67, // G4
  'y': 69, // A4
  'u': 71, // B4
  'i': 72  // C5
};

/**
 * Validate MIDI note number
 * @param {number} note - The MIDI note number
 * @returns {boolean} True if valid
 */
function isValidNote(note) {
  return !isNaN(note) && note >= 0 && note <= 127;
}

/**
 * Clear a timeout and remove it from tracking
 * @param {number} note - The note associated with the timeout
 */
function clearNoteTimeout(note) {
  if (activeTimeouts.has(note)) {
    clearTimeout(activeTimeouts.get(note));
    activeTimeouts.delete(note);
  }
}

/**
 * Initialize the piano - cache DOM elements and set up event handlers
 */
function initializePiano() {
  pianoElement = document.getElementById('piano');
  
  if (!pianoElement) {
    console.error('Piano element not found');
    return;
  }
  
  // Cache all key elements in a Map for O(1) lookup
  var allKeys = document.querySelectorAll('[data-note]');
  allKeys.forEach(function(keyElement) {
    var note = parseInt(keyElement.dataset.note, 10);
    if (isValidNote(note)) {
      keyElementsMap.set(note, keyElement);
    }
  });
  
  // Set up event handlers
  assignHandlers();
}

/**
 * Get the note number from a clicked/touched element
 * @param {HTMLElement} target - The clicked/touched element
 * @returns {number|null} The MIDI note number or null
 */
function getNoteFromElement(target) {
  if (!target || !target.dataset) {
    return null;
  }
  
  // Check if clicked element has data-note
  if (target.dataset.note) {
    return parseInt(target.dataset.note, 10);
  }
  
  // Check if clicked element is inside an anchor or black_key
  var anchor = target.closest('.anchor, .black_key');
  if (anchor && anchor.dataset && anchor.dataset.note) {
    return parseInt(anchor.dataset.note, 10);
  }
  
  // Check parent li for anchor or black_key
  var li = target.closest('li');
  if (li) {
    var keyElement = li.querySelector('.anchor, .black_key');
    if (keyElement && keyElement.dataset && keyElement.dataset.note) {
      return parseInt(keyElement.dataset.note, 10);
    }
  }
  
  return null;
}

/**
 * Add visual feedback to a key element (CSS transitions handle the animation)
 * @param {HTMLElement} keyElement - The key element to highlight
 */
function addKeyFeedback(keyElement) {
  if (keyElement) {
    keyElement.classList.add('active');
    // CSS transition handles the visual feedback
    // Remove class after duration for cleanup
    setTimeout(function() {
      if (keyElement) {
        keyElement.classList.remove('active');
      }
    }, ACTIVE_FEEDBACK_DURATION);
  }
}

/**
 * Play a note with proper cleanup
 * @param {number} note - The MIDI note number
 * @param {number} velocity - The velocity (0-127), defaults to VELOCITY constant
 */
function playNoteInternal(note, velocity) {
  if (!isValidNote(note)) {
    console.warn('Invalid MIDI note:', note);
    return;
  }
  
  // Use provided velocity or default
  var noteVelocity = (velocity !== undefined && velocity >= 0 && velocity <= 127) ? velocity : VELOCITY;
  
  // Clear any existing timeout for this note
  clearNoteTimeout(note);
  
  MIDI.setVolume(0, 127);
  MIDI.noteOn(0, note, noteVelocity, DELAY);
  MIDI.noteOff(0, note, DELAY + NOTE_OFF_DELAY);
  
  // Track timeout for cleanup
  var timeoutId = setTimeout(function() {
    activeNotes.delete(note);
    activeTimeouts.delete(note);
  }, NOTE_DURATION);
  
  activeTimeouts.set(note, timeoutId);
}

/**
 * Handle piano key clicks
 * @param {Event} event - The click event
 */
function handlePianoClick(event) {
  var note = getNoteFromElement(event.target);
  
  if (note && isValidNote(note)) {
    // Prevent duplicate triggers for the same note
    if (!activeNotes.has(note)) {
      activeNotes.add(note);
      
      // Get cached key element
      var keyElement = keyElementsMap.get(note);
      addKeyFeedback(keyElement);
      
      playNoteInternal(note);
    }
  }
}

/**
 * Handle touch events for mobile devices
 * @param {TouchEvent} event - The touch event
 */
function handleTouchStart(event) {
  event.preventDefault(); // Prevent scrolling
  var touch = event.touches[0] || event.changedTouches[0];
  if (touch) {
    var target = document.elementFromPoint(touch.clientX, touch.clientY);
    var note = getNoteFromElement(target);
    
    if (note && isValidNote(note)) {
      // Prevent duplicate triggers for the same note
      if (!activeNotes.has(note)) {
        activeNotes.add(note);
        
        // Get cached key element
        var keyElement = keyElementsMap.get(note);
        addKeyFeedback(keyElement);
        
        playNoteInternal(note);
      }
    }
  }
}

/**
 * @method assignHandlers creates the click, keydown and keyup event handlers when the font is loaded
 */
function assignHandlers() {
  if (!pianoElement) {
    console.error('Piano element not found');
    return;
  }
  
  // Handle clicks on piano keys (both white and black keys)
  pianoElement.addEventListener('click', handlePianoClick);
  
  // Handle touch events for mobile devices
  pianoElement.addEventListener('touchstart', handleTouchStart, { passive: false });
  
  // Keyboard event handlers
  document.addEventListener('keydown', parseAction);
  document.addEventListener('keyup', releaseAction);
}

/**
 * @method releaseAction executes whenever the user triggers a keyup event.
 * @param {KeyboardEvent} event
 */
function releaseAction(event) {
  var key = event.key ? event.key.toLowerCase() : null;
  
  // Only process if it's a mapped key
  if (key && key in KEYBOARD_MAP) {
    pressedKeys.delete(key);
    
    // Remove active class from the specific key element
    var note = KEYBOARD_MAP[key];
    var keyElement = keyElementsMap.get(note);
    if (keyElement) {
      keyElement.classList.remove('active');
    }
    
    // Remove from active notes set
    activeNotes.delete(note);
    clearNoteTimeout(note);
  }
}

/**
 * @method parseAction handles keydown events by detecting the user's key and playing the proper note.
 * @param {KeyboardEvent} event
 */
function parseAction(event) {
  // Normalize key to lowercase
  var key = event.key ? event.key.toLowerCase() : null;
  
  // Prevent browser shortcuts and handle key repeat
  if (key && key in KEYBOARD_MAP) {
    event.preventDefault();
    
    // Prevent key repeat - only trigger if key wasn't already pressed
    if (!pressedKeys.has(key)) {
      pressedKeys.add(key);
      
      var note = KEYBOARD_MAP[key];
      triggerAction(note);
    }
  }
}

/**
 * @method triggerAction triggers UI change to make the key look pressed and to play the note.
 * @param {number} note - The MIDI note number
 */
function triggerAction(note) {
  if (!isValidNote(note)) {
    return;
  }
  
  // Get cached key element
  var keyElement = keyElementsMap.get(note);
  if (keyElement) {
    addKeyFeedback(keyElement);
  }
  
  // Prevent duplicate triggers
  if (!activeNotes.has(note)) {
    activeNotes.add(note);
    playNoteInternal(note);
  }
}

/**
 * @method playNote plays a single note (public API).
 * @param {number} note - The MIDI note number (0-127)
 */
function playNote(note) {
  if (!isValidNote(note)) {
    console.warn('Invalid MIDI note:', note);
    return;
  }
  
  // Get cached key element for visual feedback
  var keyElement = keyElementsMap.get(note);
  if (keyElement) {
    addKeyFeedback(keyElement);
  }
  
  // Prevent duplicate triggers
  if (!activeNotes.has(note)) {
    activeNotes.add(note);
    playNoteInternal(note);
  }
}

/**
 * @method multinotes plays multiple notes simultaneously (for chords).
 * @param {number} root - The root note
 * @param {number} third - The third note
 * @param {number} fifth - The fifth note
 */
function multinotes(root, third, fifth) {
  // Validate all notes
  if (!isValidNote(root) || !isValidNote(third) || !isValidNote(fifth)) {
    console.warn('Invalid MIDI note in chord:', root, third, fifth);
    return;
  }
  
  MIDI.noteOn(0, root, VELOCITY, DELAY);
  MIDI.noteOn(0, third, VELOCITY, DELAY);
  MIDI.noteOn(0, fifth, VELOCITY, DELAY);
}

/**
 * @method playRootMajor plays the major chord in the root position
 * @param {number} note
 */
function playRootMajor(note) {
  if (!isValidNote(note)) return;
  var root = note;
  var third = note + 4;
  var fifth = note + 7;
  multinotes(root, third, fifth);
}

/**
 * @method playFirstMajorInversion plays the major chord in the first inversion
 * @param {number} note
 */
function playFirstMajorInversion(note) {
  if (!isValidNote(note)) return;
  var root = note + 4;
  var third = root + 3;
  var fifth = root + 5;
  multinotes(root, third, fifth);
}

/**
 * @method playSecondMajorInversion plays the major chord in the second inversion
 * @param {number} note
 */
function playSecondMajorInversion(note) {
  if (!isValidNote(note)) return;
  var root = note + 7;
  var third = root + 5;
  var fifth = root + 4;
  multinotes(root, third, fifth);
}

/**
 * @method playRootMinor plays the minor chord in the root position
 * @param {number} note
 */
function playRootMinor(note) {
  if (!isValidNote(note)) return;
  var root = note;
  var third = note + 3;
  var fifth = note + 7;
  multinotes(root, third, fifth);
}

/**
 * @method playFirstMinorInversion plays the minor chord in the 1st inversion
 * @param {number} note
 */
function playFirstMinorInversion(note) {
  if (!isValidNote(note)) return;
  var root = note + 3;
  var third = root + 4;
  var fifth = root + 5;
  multinotes(root, third, fifth);
}

/**
 * @method playSecondMinorInversion plays the minor chord in the 2nd inversion
 * @param {number} note
 */
function playSecondMinorInversion(note) {
  if (!isValidNote(note)) return;
  var root = note + 7;
  var third = root + 5;
  var fifth = root + 3;
  multinotes(root, third, fifth);
}

/**
 * @method playAugmented plays an augmented chord
 * @param {number} note
 */
function playAugmented(note) {
  if (!isValidNote(note)) return;
  var root = note;
  var third = note + 4;
  var fifth = root + 8;
  multinotes(root, third, fifth);
}

/**
 * @method playDiminished plays a diminished chord
 * @param {number} note
 */
function playDiminished(note) {
  if (!isValidNote(note)) return;
  var root = note;
  var third = note + 3;
  var fifth = note + 6; // Fixed: was note + 3, should be note + 6 for diminished fifth
  multinotes(root, third, fifth);
}

/**
 * @method playSuspended plays a suspended chord
 * @param {number} note
 */
function playSuspended(note) {
  if (!isValidNote(note)) return;
  var root = note;
  var third = note + 5;
  var fifth = note + 7;
  multinotes(root, third, fifth);
}

/**
 * Show error message to user
 * @param {string} message - Error message to display
 */
function showError(message) {
  console.error(message);
  // You could add a visual error message here
  // var errorDiv = document.createElement('div');
  // errorDiv.className = 'error-message';
  // errorDiv.textContent = message;
  // document.body.appendChild(errorDiv);
}

/**
 * Update MIDI device status indicator
 */
function updateMIDIStatus() {
  var statusElement = document.getElementById('midi-status');
  if (!statusElement) {
    // Create status element if it doesn't exist
    statusElement = document.createElement('div');
    statusElement.id = 'midi-status';
    statusElement.style.cssText = 'position: fixed; top: 10px; right: 10px; padding: 8px 12px; background: rgba(0,0,0,0.7); color: white; border-radius: 4px; font-size: 12px; z-index: 10000; font-family: Arial, sans-serif;';
    document.body.appendChild(statusElement);
  }
  
  if (!midiDeviceStatus.supported) {
    statusElement.textContent = 'MIDI: Not supported';
    statusElement.style.background = 'rgba(200,0,0,0.7)';
  } else if (midiDeviceStatus.connected && midiDeviceStatus.deviceCount > 0) {
    statusElement.textContent = 'MIDI: ' + midiDeviceStatus.deviceCount + ' device(s) connected';
    statusElement.style.background = 'rgba(0,150,0,0.7)';
  } else {
    statusElement.textContent = 'MIDI: No devices connected';
    statusElement.style.background = 'rgba(150,150,0,0.7)';
  }
}

/**
 * Handle MIDI message from physical keyboard
 * @param {MIDIMessageEvent} event - MIDI message event
 */
function handleMIDIMessage(event) {
  var data = event.data;
  var command = data[0] & 0xf0; // Upper nibble is command
  var channel = data[0] & 0x0f; // Lower nibble is channel (we ignore for now)
  var note = data[1];
  var velocity = data[2];
  
  // Note On (0x90) or Note Off (0x80)
  if (command === 0x90 && velocity > 0) {
    // Note On
    if (isValidNote(note)) {
      // Prevent duplicate triggers
      if (!activeNotes.has(note)) {
        activeNotes.add(note);
        
        // Get cached key element for visual feedback
        var keyElement = keyElementsMap.get(note);
        if (keyElement) {
          addKeyFeedback(keyElement);
        }
        
        // Play note with velocity from MIDI keyboard
        playNoteInternal(note, velocity);
      }
    }
  } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
    // Note Off
    if (isValidNote(note)) {
      // Remove from active notes
      activeNotes.delete(note);
      clearNoteTimeout(note);
      
      // Remove visual feedback
      var keyElement = keyElementsMap.get(note);
      if (keyElement) {
        keyElement.classList.remove('active');
      }
    }
  }
}

/**
 * Handle MIDI input device connection
 * @param {MIDIInput} input - MIDI input device
 */
function handleMIDIInputConnected(input) {
  console.log('MIDI input connected:', input.name, input.manufacturer);
  
  // Set up message handler
  input.onmidimessage = handleMIDIMessage;
  
  // Track the input
  midiInputs.set(input.id, input);
  
  // Update status
  midiDeviceStatus.connected = true;
  midiDeviceStatus.deviceCount = midiInputs.size;
  updateMIDIStatus();
}

/**
 * Handle MIDI input device disconnection
 * @param {MIDIInput} input - MIDI input device
 */
function handleMIDIInputDisconnected(input) {
  console.log('MIDI input disconnected:', input.name);
  
  // Remove message handler
  input.onmidimessage = null;
  
  // Remove from tracking
  midiInputs.delete(input.id);
  
  // Update status
  midiDeviceStatus.connected = midiInputs.size > 0;
  midiDeviceStatus.deviceCount = midiInputs.size;
  updateMIDIStatus();
}

/**
 * Initialize Web MIDI API support
 */
function initializeMIDI() {
  // Check if Web MIDI API is supported
  if (!navigator.requestMIDIAccess) {
    console.warn('Web MIDI API is not supported in this browser');
    midiDeviceStatus.supported = false;
    updateMIDIStatus();
    return;
  }
  
  midiDeviceStatus.supported = true;
  
  // Request MIDI access
  navigator.requestMIDIAccess({ sysex: false })
    .then(function(access) {
      midiAccess = access;
      
      // Handle state changes (devices connecting/disconnecting)
      access.onstatechange = function(event) {
        if (event.port.state === 'connected' && event.port.type === 'input') {
          handleMIDIInputConnected(event.port);
        } else if (event.port.state === 'disconnected' && event.port.type === 'input') {
          handleMIDIInputDisconnected(event.port);
        }
      };
      
      // Connect to existing inputs
      var inputs = access.inputs.values();
      for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
        if (input.value.state === 'connected') {
          handleMIDIInputConnected(input.value);
        }
      }
      
      updateMIDIStatus();
    })
    .catch(function(error) {
      console.error('Error accessing MIDI devices:', error);
      showError('Failed to access MIDI devices: ' + error.message);
      midiDeviceStatus.supported = false;
      updateMIDIStatus();
    });
}

/**
 * Initialize when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Web MIDI API for physical keyboard support
  initializeMIDI();
  
  try {
    MIDI.loadPlugin({
      soundfontUrl: "./soundfont/",
      instrument: "acoustic_grand_piano",
      callback: function() {
        // Trigger custom event to know when the plugin is loaded
        window.dispatchEvent(new Event('ready'));
      },
      onerror: function(error) {
        showError('Failed to load MIDI plugin: ' + (error || 'Unknown error'));
      }
    });
  } catch (error) {
    showError('Error initializing MIDI: ' + error.message);
  }
});

// Set up handlers when MIDI plugin is ready
window.addEventListener('ready', function() {
  try {
    initializePiano();
  } catch (error) {
    showError('Error initializing piano: ' + error.message);
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
  // Clear all timeouts
  activeTimeouts.forEach(function(timeoutId) {
    clearTimeout(timeoutId);
  });
  activeTimeouts.clear();
  activeNotes.clear();
  pressedKeys.clear();
  
  // Disconnect MIDI inputs
  midiInputs.forEach(function(input) {
    input.onmidimessage = null;
  });
  midiInputs.clear();
});
