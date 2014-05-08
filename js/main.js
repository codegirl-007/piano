var wholeStep = 2,
  halfStep = 1;

var major3rd = (2 * wholeStep);
var major5th = major3rd + (3 * halfStep);
//minor chord

window.onload = function () {
  MIDI.loadPlugin({
    soundfontUrl: "./soundfont/",
    instrument: "acoustic_grand_piano",
    callback: function() {
      $('#piano').on('click', function(event) {
        var note = $(event.target).data('note');
        playNote(note);
      });
      $(document).keydown(function(event) {
        var keycode = event.keyCode;
        if (keycode == 81) {
          $('.anchor[data=60]').trigger('click');
          console.log('click');
        }
      });
    }
  });

};

function playNote(note) {
  console.log(note);
  var delay = 0; // play one note every quarter second
  var velocity = 127; // how hard the note hits
  MIDI.setVolume(0, 127);
  MIDI.noteOn(0, note, velocity, delay);
  MIDI.noteOff(0, note, delay + 0.75);
}

function getAsyncMusicData() {

}