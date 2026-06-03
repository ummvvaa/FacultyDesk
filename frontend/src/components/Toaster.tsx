import { ToasterComponent } from '../hooks/useToast';
import { ToastProvider, ToastViewport } from './ui/toast';

export function Toaster() {
  return (
    <ToastProvider>
      <ToasterComponent />
      <ToastViewport />
    </ToastProvider>
  );
}

