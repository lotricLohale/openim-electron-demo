import { FC } from "react";

import "./formItemText.scss";

interface FormItemTextProps {
  children: React.ReactNode;
}

const FormItemText: FC<FormItemTextProps> = (props) => {
  return (
    <div style={{}} className={`form-item-text text-xs font-normal text-disabled`} {...props}>
      {props.children}
    </div>
  );
};

export default FormItemText;
