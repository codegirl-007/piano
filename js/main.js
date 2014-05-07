window.onload = function () {
  MIDI.loadPlugin({
    soundfontUrl: "./soundfont/",
    instrument: "acoustic_grand_piano",
    callback: function() {
      $('#piano').click(function(event) {
        var note = $(event.target).data('note');

        playNote(note)
      });
    }
  });

};

function pianoReady() {

}

function playNote(note) {
  var delay = 0; // play one note every quarter second
  var velocity = 127; // how hard the note hits
  MIDI.setVolume(0, 127);
  MIDI.noteOn(0, note, velocity, delay);
  MIDI.noteOff(0, note, delay + 0.75);
}

function getAsyncMusicData() {

}