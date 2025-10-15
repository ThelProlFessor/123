// This file ports the critical constants from the Python script for analysis.

export const HPV_LOOKUP_TABLE: { [key: string]: { [key: string]: string } } = {
    "Green":  {"POS-1": "51", "POS-2": "52", "POS-3": "39", "POS-4": "33", "POS-5": "62", "POS-6": "67", "POS-7": "43", "POS-8": "54"},
    "Yellow": {"POS-1": "16", "POS-2": "31", "POS-3": "59", "POS-4": "68", "POS-5": "11", "POS-6": "6",  "POS-7": "42", "POS-8": "84"},
    "Orange": {"POS-1": "18", "POS-2": "53", "POS-3": "45", "POS-4": "66", "POS-5": "44", "POS-6": "91", "POS-7": "40", "POS-8": "61"},
    "Red":    {"POS-1": "58", "POS-2": "56", "POS-3": "35", "POS-4": "73", "POS-5": "81", "POS-6": "90", "POS-7": "IC", "POS-8": "83"}
};

export const HIGH_RISK_GENOTYPES: Set<string> = new Set([
    "16", "18", "31", "33", "35", "39", "45", "51", "52", "53", "56", "58", "59", "66", "68", "73"
]);

export const LOW_RISK_GENOTYPES: Set<string> = new Set([
    "6", "11", "40", "42", "43", "44", "54", "61", "62", "67", "81", "83", "84", "90", "91"
]);

export const INTERNAL_CONTROL_NAME = "IC";

export const CHANNEL_NAME_MAP: Map<string, string> = new Map([
    ["green", "Green"],
    ["yellow", "Yellow"],
    ["orange", "Orange"],
    ["red", "Red"]
]);
