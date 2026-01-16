import createSpinner from "yocto-spinner";
import colors from "yoctocolors";

export const spinner = createSpinner({ text: colors.blue("Loading...") });

export function startSpinner(text?: string) {
  spinner.text = colors.blue(text || "Loading...");
  spinner.start();
}

export function stopSpinner() {
  spinner.stop();
}

export function successSpinner(text: string) {
  spinner.success(colors.green(text));
}

export function errorSpinner(text: string) {
  spinner.error(colors.red(text));
}


