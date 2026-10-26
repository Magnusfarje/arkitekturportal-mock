import { useId } from 'react';
import { TextField as MuiTextField, TextFieldProps } from '@material-ui/core';

/** MUI v4 requires an explicit ID to associate the input and its label. */
export function TextField(props: TextFieldProps) {
  const id = useId();
  return <MuiTextField id={id} {...props} />;
}
