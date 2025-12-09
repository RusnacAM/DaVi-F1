import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import type { SelectChangeEvent } from "@mui/material/Select";
import type React from "react";
import { FormControl, InputLabel } from "@mui/material";

interface MultiSelectProps {
  value: string[];
  setValue: (eventVal: string[]) => void;
  menuItems: string[];
  label: string;
  selectLimit: number;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  value,
  setValue,
  menuItems,
  label,
  selectLimit,
}) => {
  const handleChange = (event: SelectChangeEvent<typeof value>) => {
    if (event.target.value.length > selectLimit) {
      const yearList = [
        ...value.slice(0, selectLimit - 1),
        event.target.value[event.target.value.length - 1],
      ];
      setValue(yearList);
    } else {
      setValue(event.target.value as string[]);
    }
  };

  return (
    <FormControl className="filter-select">
      <InputLabel
        id="session-year-label"
        className="filter-label"
        shrink={false}
      >
        {label}
      </InputLabel>
      <Select
        id="session-year-select"
        value={value}
        onChange={handleChange}
        multiple
        renderValue={(selected) => selected.join(", ")}
        MenuProps={{
          PaperProps: {
            style: {
              maxHeight: 350,
              overflowY: "auto",
              backgroundColor: "#2a2a30ff",
              color: "white",
              borderRadius: "8px",
            },
          },
          anchorOrigin: {
            vertical: "bottom",
            horizontal: "left",
          },
          transformOrigin: {
            vertical: "top",
            horizontal: "left",
          },
        }}
      >
        {menuItems.map((menuItem) => (
          <MenuItem key={menuItem} value={menuItem}>
            {menuItem}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
