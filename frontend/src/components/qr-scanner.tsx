import { Scanner, useDevices } from '@yudiel/react-qr-scanner'
import { useEffect, useRef, useState } from 'react'

type QrScannerProps = {
  onDecode: (value: string) => void
}

function pickDefaultCamera(cameras: { deviceId: string; label: string }[]) {
  const back = cameras.find((camera) =>
    /back|rear|environment|задн/i.test(camera.label),
  )
  return back?.deviceId ?? cameras.at(-1)?.deviceId ?? cameras[0]?.deviceId ?? ''
}

function QrScanner({ onDecode }: QrScannerProps) {
  const devices = useDevices()
  const onDecodeRef = useRef(onDecode)
  const [cameraId, setCameraId] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const selectedId = cameraId || pickDefaultCamera(devices)

  useEffect(() => {
    onDecodeRef.current = onDecode
  }, [onDecode])

  return (
    <div className="space-y-3">
      {devices.length > 1 && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Камера</span>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
            onChange={(event) => setCameraId(event.target.value)}
            value={selectedId}
          >
            {devices.map((camera, index) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label || `Камера ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="overflow-hidden rounded-xl bg-black">
        <Scanner
          allowMultiple={false}
          classNames={{ container: 'min-h-56 w-full' }}
          components={{ finder: true }}
          constraints={
            selectedId
              ? { deviceId: { exact: selectedId } }
              : { facingMode: 'environment' }
          }
          formats={['qr_code']}
          onError={() => {
            setCameraError(
              'Немає доступу до камери. Потрібні дозвіл і HTTPS або localhost.',
            )
          }}
          onScan={(codes) => {
            const value = codes[0]?.rawValue?.trim()
            if (value) onDecodeRef.current(value)
          }}
          sound={false}
        />
      </div>
      {cameraError && (
        <p className="text-sm text-destructive" role="alert">
          {cameraError}
        </p>
      )}
    </div>
  )
}

export { QrScanner }
