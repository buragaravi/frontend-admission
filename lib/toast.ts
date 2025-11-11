import toast from 'react-hot-toast';

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      duration: 4000,
    });
  },
  error: (message: string) => {
    toast.error(message, {
      duration: 5000,
    });
  },
  info: (message: string) => {
    toast(message, {
      icon: 'ℹ️',
      duration: 4000,
    });
  },
  loading: (message: string) => {
    return toast.loading(message);
  },
};

