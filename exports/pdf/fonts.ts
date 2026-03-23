import { Font } from "@react-pdf/renderer"
import path from "path"

export function registerThaiFonts() {
  Font.register({
    family: "THSarabunNew",
    fonts: [
      {
        src: path.join(process.cwd(), "public/fonts/THSarabunNew.ttf"),
        fontWeight: "normal",
      },
      {
        src: path.join(process.cwd(), "public/fonts/THSarabunNew-Bold.ttf"),
        fontWeight: "bold",
      },
    ],
  })
}

// Call registration at module load
registerThaiFonts()
