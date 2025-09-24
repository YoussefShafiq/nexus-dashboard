import { createContext, useState } from "react";



export let SidebarContext = createContext(true)

export default function SidebarContextProvider(props) {

    const [sidebarOpen, setSidebarOpen] = useState(true)

    return <SidebarContext.Provider value={{ sidebarOpen, setSidebarOpen }} >
        {props.children}
    </SidebarContext.Provider>
}