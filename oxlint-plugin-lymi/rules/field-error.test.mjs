import { testRule } from "../test/run.mjs";

const filename = "edit.tsx";

testRule("field-error", {
  message:
    "An error line is FieldError from src/ui/field.tsx: it centres the icon on the first line, " +
    "keeps the text on the form's line and reads it out. Pass flush under a field drawn as a " +
    "line with no box.",
  valid: [
    { filename, code: 'const a = <Icon name="alert" size={16} />;' },
    { filename, code: 'const b = <Icon name="alert" size={14}></Icon>;' },
    { filename, code: 'const c = <Icon name={"alert"} size={14} />;' },
    { filename, code: 'const d = <UI.Icon name="alert" size={14} />;' },
  ],
  invalid: [
    {
      filename,
      code: 'const a = <Icon name="alert" size={14} />;',
      errors: ['name="alert" size={14}'],
    },
    {
      filename,
      code: 'const b = <Icon size={14} color="red" name="alert" />;',
      errors: ['size={14} color="red" name="alert"'],
    },
    {
      filename,
      code: 'const c = <Icon {...rest} name="alert" size={ 14 } />;',
      errors: ['{...rest} name="alert" size={ 14 }'],
    },
  ],
});
