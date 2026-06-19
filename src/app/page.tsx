import { Mic } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <div className="bg-primary text-primary-foreground mx-auto flex size-12 items-center justify-center rounded-xl">
            <Mic className="size-6" />
          </div>
          <CardTitle className="mt-2 text-2xl">Transcript Studio</CardTitle>
          <CardDescription className="text-base">
            Record or import a transcript, then ask an LLM about it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Your transcripts will appear in the sidebar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
