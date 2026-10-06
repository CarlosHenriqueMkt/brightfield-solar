import { notFound } from 'next/navigation';
import SceneCalibrationPanel from './SceneCalibrationPanel';

export const metadata = {
  title: 'Brightfield scene calibration',
  robots: { index: false, follow: false },
};

export default function ScenePreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <SceneCalibrationPanel />;
}
