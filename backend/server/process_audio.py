import sys
import os
import json
import wave
import numpy as np
from pydub import AudioSegment

def convert_mp3_to_wav(mp3_path, wav_path):
    audio = AudioSegment.from_mp3(mp3_path)
    audio.export(wav_path, format="wav")

def process_audio(file_path):
    with wave.open(file_path, 'r') as wav_file:
        frames = wav_file.readframes(wav_file.getnframes())
        samples = np.frombuffer(frames, dtype=np.int16)
        frame_rate = wav_file.getframerate()
        return {
            'samples': samples.tolist(),
            'frame_rate': frame_rate
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 process_audio.py <file_path>")
        sys.exit(1)
    
    mp3_path = sys.argv[1]
    wav_path = os.path.splitext(mp3_path)[0] + '.wav'  # Cambia la extensión a .wav
    
    convert_mp3_to_wav(mp3_path, wav_path)
    data = process_audio(wav_path)
    print(json.dumps(data))
