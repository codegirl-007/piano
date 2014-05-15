window.onload = function () {
  MIDI.loadPlugin({
    soundfontUrl: "./soundfont/",
    instrument: "acoustic_grand_piano",
    callback: function() {
      $(window).trigger('ready'); //trigger an event to know when the plugin is loaded.
    }
  });
};

$(window).on('ready', function() { //here we are listening for the ready event.
  assignHandlers();
});

/**
 * @method assignHandlers creates the click, keydown and keyup event handlers when the font is loaded
 */
function assignHandlers() {
  $('#piano').on('click', function(event) {
    var note = $(event.target).data('note');
    playNote(note);
  });
  $(document).on('keydown', parseAction);
  $(document).on('keyup', releaseAction);
}

/**
 * @method method to execute whenever the user triggers a keyup event.
 * @param event
 */
function releaseAction(event) {
  $(".anchor").removeClass('active'); //make the piano keys look like they're being pressed when user is using a keyboard
}

/**
 * @method parseAction handles keydown events by detecting the user's event keycode and playing the proper note.
 * @param event
 */
function parseAction(event) {
  var keycode = event.keyCode;

  switch (keycode) {
    case 81:
      triggerAction(60)
      break;
    case 87:
      triggerAction(62)
      break;
    case 69:
      triggerAction(64);
      break;
    case 82:
      triggerAction(65);
      break;
    case 84:
      triggerAction(67);
      break;
    case 89:
      triggerAction(69);
      break;
    case 85:
      triggerAction(71);
      break;
    case 73:
      triggerAction(72);
      break;
  }
}

/**
 * @method triggerAction method to trigger UI change to make the key look pressed and to play the note.
 * @param note
 */
function triggerAction(note) {
  $(".anchor[data-note="+note+"]").addClass('active');
  playNote(note);
}

var delay = 0; // play one note every quarter second
var velocity = 127; // how hard the note hits

/**
 * @method playNote plays the note.
 * @param note the midi number of the key the user wants to press.
 */
function playNote(note) {
  MIDI.setVolume(0, 127);
  MIDI.noteOn(0, note, velocity, delay);
  MIDI.noteOff(0, note, delay + 0.75);
}

/**
 * @playRootMajor play the major chord in the root position
 * @param note
 */
function playRootMajor(note) {
  var root = note;
  var third = note + 4;
  var fifth = note +7;
  MIDI.noteOn(0, root, velocity, delay);
  MIDI.noteOn(0, third, velocity, delay);
  MIDI.noteOn(0, fifth, velocity, delay);
}

/**
 * playFirstMajorInversion play the major chord in the first inversion
 * @param note
 */
function playFirstMajorInversion(note) {
  var root = note+4;
  var third = root+3;
  var fifth = root+5;
  MIDI.noteOn(0, root, velocity, delay);
  MIDI.noteOn(0, third, velocity, delay);
  MIDI.noteOn(0, fifth, velocity, delay);
}

/**
 * @playSecondMajorInversion play the major chord in teh second inversion
 * @param note
 */
function playSecondMajorInversion(note) {
  var root = note+7;
  var third = root+5;
  var fifth = root+4;
  MIDI.noteOn(0, root, velocity, delay);
  MIDI.noteOn(0, third, velocity, delay);
  MIDI.noteOn(0, fifth, velocity, delay);
}

/**
 * @method playRootMinor play the minor chord in the root position
 * @param note
 */
function playRootMinor(note) {
  var root = note;
  var third = note + 3;
  var fifth = note +7;
  MIDI.noteOn(0, root, velocity, delay);
  MIDI.noteOn(0, third, velocity, delay);
  MIDI.noteOn(0, fifth, velocity, delay);
}

/**
 * @method playFirstMinorInversion play the minor chord in the 1st inversion
 * @param note
 */
function playFirstMinorInversion(note) {
  var root = note+3;
  var third = root+4;
  var fifth = root+5;
  MIDI.noteOn(0, root, velocity, delay);
  MIDI.noteOn(0, third, velocity, delay);
  MIDI.noteOn(0, fifth, velocity, delay);
}

/**
 * @method playSecondMinorInversion play the minor chord in the 2nd inversion
 * @param note
 */
function playSecondMinorInversion(note) {
  var root = note+7;
  var third = root+5;
  var fifth = root+3;
  MIDI.noteOn(0, root, velocity, delay);
  MIDI.noteOn(0, third, velocity, delay);
  MIDI.noteOn(0, fifth, velocity, delay);
}