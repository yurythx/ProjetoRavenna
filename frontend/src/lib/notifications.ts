import { toast } from "sonner";

function stringifyError(err: unknown) {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export const notify = {
  success(title: string, description?: string) {
    toast.success(title, { description });
  },
  warning(title: string, description?: string) {
    toast.warning(title, { description });
  },
  error(title: string, error?: unknown) {
    toast.error(title, { description: stringifyError(error) });
  },
};

