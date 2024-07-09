import sys
import json
import wave
import numpy as np

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
    file_path = sys.argv[1]
    data = process_audio(file_path)
    print(json.dumps(data))
