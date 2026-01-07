import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

const Root = DropdownMenuPrimitive.Root;
const Trigger = DropdownMenuPrimitive.Trigger;
const Content = DropdownMenuPrimitive.Content;
const Item = DropdownMenuPrimitive.Item;
const Separator = DropdownMenuPrimitive.Separator;

const Sub = DropdownMenuPrimitive.Sub;
const SubContent = DropdownMenuPrimitive.SubContent;
const SubTrigger = DropdownMenuPrimitive.SubTrigger;

export {
	Root,
	Content,
	Item,
	Separator,
	Sub,
	SubContent,
	SubTrigger,
	Trigger,
	//
	Root as DropdownMenu,
	Content as DropdownMenuContent,
	Item as DropdownMenuItem,
	Separator as DropdownMenuSeparator,
	Sub as DropdownMenuSub,
	SubContent as DropdownMenuSubContent,
	SubTrigger as DropdownMenuSubTrigger,
	Trigger as DropdownMenuTrigger
};
