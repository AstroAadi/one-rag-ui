import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms'; 

@Component({
  selector: 'app-input-bar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './input-bar.component.html',
  styleUrls: ['./input-bar.component.css']
})
export class InputBarComponent {
  userInput: string = '';

  @Output() sendMessage = new EventEmitter<string>();
  @Output() attachFile = new EventEmitter<void>();

  onSend() {
    if (this.userInput.trim()) {
      this.sendMessage.emit(this.userInput);
      this.userInput = '';
    }
  }

  onAttach() {
    this.attachFile.emit();
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }
}