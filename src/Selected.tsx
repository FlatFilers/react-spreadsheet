import classnames from "classnames";
import React from "react";
import { connect } from "unistore/react";

import FloatingRect, { mapStateToProps } from "./FloatingRect";
import { size } from "./point-set";
import { default as Types, IStoreState } from "./types";

type Props = {
  className?: string;
  hidden?: boolean;
  dragging: boolean;
} & Types.IDimensions;

const Selected = ({ dragging, ...rest }: Props) => (
  <FloatingRect {...rest} className={classnames("selected", { dragging })} />
);

export default connect((state: IStoreState<any>) => {
  const cells = state.selected;
  const nextState = mapStateToProps(cells)(state);
  return {
    ...nextState,
    hidden: nextState.hidden || size(cells) === 1,
    dragging: state.dragging
  };
})(Selected);
