import wfdb
import json
import sys

def process_ecg(file_path):
    try:
        record = wfdb.rdrecord(file_path)
        signals = record.p_signal[:,0]
        fs = record.fs
        timestamps = [i / fs for i in range(len(signals))]
        half_index = len(signals) // 2
        half_signal = signals[:half_index]
        return {
            'timestamps': timestamps,
            'signals': half_signal.tolist()
        }
    except Exception as e:
        print(f"Error al leer el registro: {e}")
        return None

if __name__ == '__main__':
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        data = process_ecg(file_path)
        if data:
            print(json.dumps(data))
        else:
            print(json.dumps({'error': 'Error al procesar el archivo .dat'}))
    else:
        print(json.dumps({'error': 'No se proporcionó el nombre del archivo.'}))
