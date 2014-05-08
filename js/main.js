window.onload = function () {
  MIDI.loadPlugin({
    soundfontUrl: "./soundfont/",
    instrument: "acoustic_grand_piano",
    callback: function() {
      $('#piano').on('click', function(event) {
        var note = $(event.target).data('note');
        playNote(note);
      });
      $(document).on('keydown', parseAction);
      $(document).on('keyup', releaseAction);
    }
  });
};

function releaseAction(event) {
  $(".anchor").removeClass('active');
}

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

function triggerAction(note) {
  $(".anchor[data-note="+note+"]").addClass('active');
  playNote(note);
}



function playNote(note) {
  var delay = 0; // play one note every quarter second
  var velocity = 127; // how hard the note hits
  MIDI.setVolume(0, 127);
  MIDI.noteOn(0, note, velocity, delay);
  MIDI.noteOff(0, note, delay + 0.75);
}
