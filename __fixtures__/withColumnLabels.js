import { createFixture } from "react-cosmos";

import Spreadsheet, {
  createEmptyMatrix
} from "../dist/SpreadsheetStateProvider";
import { INITIAL_ROWS } from "./Basic";
import "./index.css";

const columnLabels = ["Name", "Age", "Email", "Address"];
const initialData = createEmptyMatrix(INITIAL_ROWS, columnLabels.length);

Spreadsheet.displayName = "Spreadsheet";

export default createFixture({
  component: Spreadsheet,
  props: {
    data: initialData,
    columnLabels
  }
});
