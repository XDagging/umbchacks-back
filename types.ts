export type Options = {
    key: Buffer;
    cert: Buffer;
    rejectUnauthorized?: boolean;
};


export type RegisterBody = {
    name: string;
    email: string;
    password: string;
    
}


export type LoginBody = {
    email: string;
    password: string;
}

export type CodeBody = {
    email: string;
}

export type ChangePasswordBody = {
    code: number;
    password: string;
    email: string;
}





export type User = {
    uuid: string;
    name: string;
    emailHash: string;
    email: string;
    password: string;
    passwordCode?: number;
}


// At the function
export type LocateEntryType = Promise<User | User[] | "">;


// At function call
export type LocateEntryEntry =  "" | User | User[];


