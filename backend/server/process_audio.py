import sys
import os
import json
import wave
import numpy as np
from pydub import AudioSegment

def convert_mp3_to_wav(mp3_path, wav_path):
    audio = AudioSegment.from_mp3(mp3_path)
    audio.export(wav_path, format="wav")

def process_wav(file_path):
    with wave.open(file_path, 'r') as wav_file:
        frames = wav_file.readframes(wav_file.getnframes())
        samples = np.frombuffer(frames, dtype=np.int16)
        frame_rate = wav_file.getframerate()
        return {
            'samples': samples.tolist(),
            'frame_rate': frame_rate
        }

def process_dat(file_path):
    timestamps = []
    signal_values = []
    with open(file_path, 'r', encoding='ISO-8859-1') as dat_file:  # Especifica la codificación
        for line in dat_file:
            if line.strip():  # Ignorar líneas vacías
                timestamp, signal_value = map(float, line.split(','))
                timestamps.append(timestamp)
                signal_values.append(signal_value)
    return {
        'timestamps': timestamps,
        'signal_values': signal_values
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 process_audio.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    ext = os.path.splitext(file_path)[1]

    if ext == '.mp3':
        wav_path = os.path.splitext(file_path)[0] + '.wav'
        convert_mp3_to_wav(file_path, wav_path)
        data = process_wav(wav_path)
    elif ext == '.dat':
        data = process_dat(file_path)
    else:
        print("Unsupported file type")
        sys.exit(1)
    
    print(json.dumps(data))
