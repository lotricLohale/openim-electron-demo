import { Button, Input, InputRef, Space } from "antd";
import React, { useRef } from "react";

import { CountrySelector, usePhoneInput } from "react-international-phone";
import { ParsedCountry } from "react-international-phone/build/types";

import "react-international-phone/build/index.css";
import "./index.scss";

interface AntPhoneProps {
  value?: string;
  onChange?: (data: PhoneData) => void;
  placeholder: string;
}

export type PhoneData = {
  phone: string;
  inputValue: string;
  country: ParsedCountry;
};

export const AntPhone: React.FC<AntPhoneProps> = ({ value, onChange, placeholder }) => {
  const firstRef = React.useRef(true);
  const phoneInput = usePhoneInput({
    defaultCountry: "cn",
    value,
    onChange: (data) => {
      if (firstRef.current) {
        firstRef.current = false;
        return;
      }
      onChange?.({ ...data });
    },
  });
  const inputRef = useRef<InputRef>(null);
  return (
    <div className="rtc-phone-input">
      <CountrySelector
        selectedCountry={phoneInput.country.iso2}
        onSelect={(country) => phoneInput.setCountry(country.iso2)}
        renderButtonWrapper={({ children, rootProps }) => (
          <Button
            {...rootProps}
            style={{
              padding: "4px",
              height: "100%",
              zIndex: 1, // fix focus overlap
            }}
          >
            {children}
          </Button>
        )}
        dropdownStyleProps={{
          style: {
            top: "35px",
          },
        }}
      />
      <Input
        placeholder={placeholder}
        type="tel"
        size="large"
        value={phoneInput.inputValue}
        ref={inputRef}
        onChange={(e) => {
          // const nativeEvent = e.nativeEvent as any;
          // if (nativeEvent.isComposing || !nativeEvent.data) {
          // }
          phoneInput.handlePhoneValueChange(e);
          e.stopPropagation();
        }}
      />
    </div>
  );
};
