import React from "react";
import { connect } from "unistore/react";

import FloatingRect, { mapStateToProps } from "./FloatingRect";
import { map } from "./point-map";
import { from } from "./point-set";
import { IStoreState } from "./types";

const Copied = (props: any) => <FloatingRect {...props} className="copied" />;

export default connect((state: IStoreState<any>) =>
  mapStateToProps(state.hasPasted ? from([]) : map(() => true, state.copied))(
    state
  )
)(Copied);
